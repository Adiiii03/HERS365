/**
 * Email/password authentication (bcrypt + JWT).
 * Mounted under /api/auth alongside the OAuth router.
 */
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { and, eq } from 'drizzle-orm';
import { db } from './db';
import * as schema from './schema';
import { sendPasswordResetEmail, sendVerificationEmail } from './email';
import * as auth from './auth';
import { isRegistrationEnabled } from './lib/registration';
import { createPendingAthlete, guardianFailureResponse, maskEmail } from './lib/guardianRegistration';
import { issueCode, verifyCode, hashCode, type CodePurpose } from './lib/verificationCodes';
import { makeLimiterStore } from './lib/limiterStore';

const router = express.Router();

const BCRYPT_ROUNDS = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// [D-10] Cap account creation at 5 per IP per hour to block bulk fake signups.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeLimiterStore('email-register'),
  message: { error: 'Too many accounts created from this network — try again later' },
});

// Mirror the loginLimiter config used in authRoutes.ts so the email/password
// login surface gets the same brute-force protection as the OAuth-aware
// router. `max` is read as a function on every request so tests can lower
// the cap via env without remounting the route.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => {
    const raw = Number(process.env.LOGIN_RATE_LIMIT_MAX);
    return Number.isFinite(raw) && raw > 0 ? raw : 20;
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: makeLimiterStore('email-login'),
  message: { error: 'Too many attempts — try again in 15 minutes' },
});

// Stricter cap on /forgot-password + /reset-password to make reset-token
// brute-forcing and reset-email spam unviable. Same env-driven `max` so the
// throttle test can run with a low budget without slowing the suite.
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => {
    const raw = Number(process.env.PASSWORD_RESET_RATE_LIMIT_MAX);
    return Number.isFinite(raw) && raw > 0 ? raw : 5;
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: makeLimiterStore('email-pw-reset'),
  message: { error: 'Too many password reset requests — try again later' },
});

// PRD section 7 item 7: /verify-email previously had no limiter, making the
// token space brute-forceable without a per-IP cost.
const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => {
    const raw = Number(process.env.VERIFY_EMAIL_RATE_LIMIT_MAX);
    return Number.isFinite(raw) && raw > 0 ? raw : 10;
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: makeLimiterStore('email-verify'),
  message: { error: 'Too many verification attempts — try again later' },
});

// DB-backed link tokens (PRD section 7 item 2): the emailed token is a 256-bit
// random string; the guardian_verification_codes row stores only its HMAC (in
// both link_token, the lookup key, and code_hash, the value verifyCode compares
// with timingSafeEqual). issueCode is kept as the single issuance choke point
// so its cooldown/hourly/lifetime/per-destination caps apply; its short display
// code is discarded and the row is rekeyed to the long token, since these
// emails embed a link rather than showing an 8-char code.
async function issueEmailLinkToken(
  playerId: number,
  purpose: CodePurpose,
  destination: string,
): Promise<{ ok: true; token: string } | { ok: false }> {
  const issued = await issueCode({ playerId, channel: 'email', destination, purpose });
  if (!issued.ok) return { ok: false };

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashCode(token);
  const gvc = schema.guardianVerificationCodes;
  await db
    .update(gvc)
    .set({ linkToken: tokenHash, codeHash: tokenHash })
    .where(and(eq(gvc.codeHash, hashCode(issued.code)), eq(gvc.used, false)));
  return { ok: true, token };
}

async function redeemEmailLinkToken(token: string, purpose: CodePurpose) {
  return verifyCode({ linkToken: hashCode(token), purpose, channel: 'email', code: token });
}

// Issue the same JWT shape as the canonical auth router. Tokens minted here
// previously omitted userId/role/name, which broke any downstream route that
// branched on req.user.role or read req.user.userId.
function signEmailAuthToken(player: { id: number; email: string; name: string | null }): string {
  return auth.signToken({
    userId: player.id,
    email: player.email,
    role: 'athlete',
    name: player.name ?? '',
  });
}

router.post('/register', registerLimiter, async (req, res) => {
  if (!isRegistrationEnabled()) {
    return res.status(403).json({ error: 'Registration is currently closed.' });
  }
  const { email, password, name, dob, parentEmail, guardianEmail, guardianPhone } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // This endpoint always creates an athlete, so every signup goes through the
  // shared guardian-gated choke point.
  const rawGuardianEmail = guardianEmail ?? parentEmail;
  if (typeof rawGuardianEmail !== 'string' || !rawGuardianEmail.trim()) {
    return res.status(400).json({ code: 'GUARDIAN_EMAIL_REQUIRED', error: 'A parent or guardian email is required for athlete accounts.' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await db
      .select()
      .from(schema.players)
      .where(eq(schema.players.email, normalizedEmail))
      .limit(1);
    if (existing.length > 0) {
      // Enumeration defense (PRD section 7 item 15): respond exactly like a
      // fresh signup instead of a distinct 409, and notify the real owner via
      // a reset-style email so a legitimate re-signup can still recover.
      const issued = await issueEmailLinkToken(existing[0].id, 'password_reset', normalizedEmail);
      if (issued.ok) {
        sendPasswordResetEmail(normalizedEmail, issued.token)
          .catch(() => console.error('[email-auth/register] existing-account notice dispatch failed'));
      }
      return res.status(202).json({
        status: 'pending_guardian',
        pendingToken: crypto.randomBytes(32).toString('base64url'),
        guardianEmailMasked: maskEmail(rawGuardianEmail.toLowerCase().trim()),
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await createPendingAthlete({
      email,
      passwordHash,
      name: name || email.split('@')[0],
      dob,
      guardianEmail: rawGuardianEmail,
      guardianPhone: typeof guardianPhone === 'string' ? guardianPhone : null,
      emailVerified: false,
      signupIp: req.ip ?? null,
      signupUserAgent: req.get('user-agent') ?? null,
    });
    if (!result.ok) {
      const { status, body } = guardianFailureResponse(result);
      return res.status(status).json(body);
    }

    return res.status(202).json({
      status: 'pending_guardian',
      pendingToken: result.pendingToken,
      guardianEmailMasked: result.guardianEmailMasked,
    });
  } catch (err) {
    console.error('[email-auth/register] 500:', err);
    return res.status(500).json({ error: 'Authentication request failed, please try again' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const rows = await db
      .select()
      .from(schema.players)
      .where(eq(schema.players.email, email))
      .limit(1);

    const player = rows[0];
    if (!player || !player.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, player.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (player.status !== 'active') {
      return res.status(403).json({ code: player.status === 'deactivated' ? 'ACCOUNT_DEACTIVATED' : 'GUARDIAN_PENDING' });
    }

    const token = signEmailAuthToken(player);

    return res.json({
      token,
      user: {
        id: player.id,
        email: player.email,
        name: player.name,
        subscriptionTier: player.subscriptionTier,
      },
    });
  } catch (err) {
    console.error('[email-auth/login] 500:', err);
    return res.status(500).json({ error: 'Authentication request failed, please try again' });
  }
});

router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });

  try {
    const rows = await db.select().from(schema.players).where(eq(schema.players.email, email)).limit(1);
    // Always respond 200 to prevent email enumeration — including when the
    // issuance caps in issueCode reject the request.
    if (rows.length) {
      const issued = await issueEmailLinkToken(rows[0].id, 'password_reset', email);
      if (issued.ok) await sendPasswordResetEmail(email, issued.token);
    }
    return res.json({ message: 'If that email exists, a reset link was sent.' });
  } catch (err) {
    console.error('[email-auth/forgot-password] 500:', err);
    return res.status(500).json({ error: 'Authentication request failed, please try again' });
  }
});

router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || typeof token !== 'string' || !password) {
    return res.status(400).json({ error: 'token and password are required' });
  }
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const result = await redeemEmailLinkToken(token, 'password_reset');
    if (!result.ok || result.row.playerId == null) {
      return res.status(400).json({ error: 'Reset token is invalid or expired' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await db.update(schema.players).set({ passwordHash }).where(eq(schema.players.id, result.row.playerId));
    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[email-auth/reset-password] 500:', err);
    return res.status(500).json({ error: 'Authentication request failed, please try again' });
  }
});

// Authenticated re-request of the confirmation email. The old in-memory
// verification Map had no issuance path at all; this is now the one.
router.post('/send-verification', verifyEmailLimiter, auth.requireAuth, async (req, res) => {
  const user = (req as auth.AuthenticatedRequest).user;
  try {
    const [player] = await db.select().from(schema.players).where(eq(schema.players.id, user.userId)).limit(1);
    if (!player) return res.status(404).json({ error: 'Account not found' });
    if (player.emailVerified) return res.json({ message: 'Email is already verified.' });

    const issued = await issueEmailLinkToken(player.id, 'email_verify', player.email);
    if (!issued.ok) {
      return res.status(429).json({ error: 'A verification email was sent recently — try again later' });
    }
    await sendVerificationEmail(player.email, issued.token);
    return res.json({ message: 'Verification email sent.' });
  } catch (err) {
    console.error('[email-auth/send-verification] 500:', err);
    return res.status(500).json({ error: 'Verification request failed, please try again' });
  }
});

router.post('/verify-email', verifyEmailLimiter, async (req, res) => {
  const { token } = req.body || {};
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'token is required' });

  try {
    const result = await redeemEmailLinkToken(token, 'email_verify');
    if (!result.ok || result.row.playerId == null) {
      return res.status(400).json({ error: 'Verification link is invalid or expired' });
    }

    await db.update(schema.players).set({ emailVerified: true }).where(eq(schema.players.id, result.row.playerId));
    return res.json({ message: 'Email verified — your profile is now visible to coaches.' });
  } catch (err) {
    console.error('[email-auth/verify-email] 500:', err);
    return res.status(500).json({ error: 'Verification failed, please try again' });
  }
});

// Test-only export: lets the throttle test reset the limiter state between
// cases (the in-memory store would otherwise persist counters across tests in
// the same file). Mirrors the _resetMessageRateLimitForTests pattern used by
// server/middleware/messageRateLimit.ts.
export const _emailAuthLimitersForTests = {
  login: loginLimiter,
  passwordReset: passwordResetLimiter,
  verifyEmail: verifyEmailLimiter,
};

export default router;
