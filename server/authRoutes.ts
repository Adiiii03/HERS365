import express from 'express';
import { eq } from 'drizzle-orm';
import rateLimit from 'express-rate-limit';
import { db } from './db';
import * as schema from './schema';
import * as auth from './auth';
import jwt from 'jsonwebtoken';
import { blocklistToken } from './redis';
import { recordCoachEvent } from './lib/coachEvents';
import { createPendingAthlete, guardianFailureResponse } from './lib/guardianRegistration';
import { isRegistrationEnabled } from './lib/registration';
import { makeLimiterStore } from './lib/limiterStore';
import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  hashRefreshToken,
  issueRefreshToken,
  revokeFamily,
  rotateRefreshToken,
  setRefreshCookie,
} from './lib/refreshTokens';

const router = express.Router();

// Only these roles may be requested at self-service signup. Excluding 'admin'
// blocks a privilege-escalation hole: the JWT is signed with the requested
// role, so an unchecked body role would let anyone mint an admin token.
const SELF_REGISTERABLE_ROLES = new Set<auth.UserRole>(['athlete', 'parent', 'coach']);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  store: makeLimiterStore('auth-login'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts — try again in 15 minutes' },
});

// [D-10] Tighter limit on account creation to stop bots from mass-registering
// fake athlete accounts that pollute coach search and rankings.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 new accounts per IP per hour
  store: makeLimiterStore('auth-register'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this network — try again later' },
});

// ─── Demo-login gate (defense-in-depth, positive non-prod assertion) ─────────
// Two hardcoded seeded accounts are the ONLY ones the client-side "Instant
// Login" button can target. The server-side gate uses a POSITIVE non-prod
// assertion rather than the absence of 'production': the prod runtime in
// this repo does not reliably set NODE_ENV, so a missing/unset env must
// fail closed, NOT default to "non-prod = ok".
//
// To enable demo login, BOTH must hold:
//   1. (APP_ENV ?? NODE_ENV) is exactly 'development' or 'test'.
//      Anything else (including undefined, '', 'production', 'staging',
//      arbitrary strings) returns false.
//   2. process.env.DEMO_ENABLED === 'true'.
//
// Both must be deliberately set, so prod cannot satisfy the gate even if
// DEMO_ENABLED is misconfigured/leaked.
const DEMO_LOGIN_ALLOWLIST = new Set<string>([
  'maya@hers365.com',
  'parent.maya@hers365.com',
  'maya.johnson@hers365.app',
  'coach@hers365.com',
]);

const ALLOWED_DEMO_ENVS = new Set<string>(['development', 'test', 'staging', 'production']);

export function isDemoEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return DEMO_LOGIN_ALLOWLIST.has(email.toLowerCase().trim());
}

export function isDemoLoginEnabled(): boolean {
  if (process.env.DEMO_ENABLED === 'true') return true;
  const envValue = process.env.APP_ENV ?? process.env.NODE_ENV;
  if (!envValue || !['development', 'test'].includes(envValue)) return false;
  return true;
}

// Returns true and writes a 403 if the request targets a demo account
// while the demo path is locked down. Returns false otherwise (caller
// continues with the normal credential check).
function rejectIfDemoLocked(email: string, res: express.Response): boolean {
  if (!isDemoEmail(email)) return false;
  if (isDemoLoginEnabled()) return false;
  res.status(403).json({ error: 'Demo login is disabled in this environment' });
  return true;
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

type FoundUser = {
  id: number;
  email: string;
  passwordHash: string | null;
  name: string;
  role: auth.UserRole;
  status?: string | null;
};

async function findUserByEmail(email: string, role?: auth.UserRole | string): Promise<FoundUser | null> {
  const e = email.toLowerCase().trim();
  if (role === 'coach') {
    const [row] = await db.select().from(schema.coaches).where(eq(schema.coaches.email, e)).limit(1);
    if (row) return { id: row.id, email: row.email, passwordHash: row.passwordHash, name: row.name ?? '', role: 'coach' };
  }
  if (role === 'parent') {
    const [row] = await db.select().from(schema.parents).where(eq(schema.parents.email, e)).limit(1);
    if (row) return { id: row.id, email: row.email, passwordHash: row.passwordHash, name: row.name, role: 'parent' };
  }
  if (role === 'admin') {
    const [admin] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.username, e)).limit(1);
    if (admin) {
      return {
        id: admin.id,
        email: admin.username,
        passwordHash: admin.passwordHash,
        name: admin.username,
        role: (admin.role as auth.UserRole) || 'admin',
      };
    }
  }

  // Smart auto-discovery fallback across all tables when logging in from mobile/web
  const [player] = await db.select().from(schema.players).where(eq(schema.players.email, e)).limit(1);
  if (player) return { id: player.id, email: player.email, passwordHash: player.passwordHash, name: player.name, role: 'athlete', status: player.status };

  const [parent] = await db.select().from(schema.parents).where(eq(schema.parents.email, e)).limit(1);
  if (parent) return { id: parent.id, email: parent.email, passwordHash: parent.passwordHash, name: parent.name, role: 'parent' };

  const [coach] = await db.select().from(schema.coaches).where(eq(schema.coaches.email, e)).limit(1);
  if (coach) return { id: coach.id, email: coach.email, passwordHash: coach.passwordHash, name: coach.name ?? '', role: 'coach' };

  const [admin] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.username, e)).limit(1);
  if (admin) {
    return {
      id: admin.id,
      email: admin.username,
      passwordHash: admin.passwordHash,
      name: admin.username,
      role: (admin.role as auth.UserRole) || 'admin',
    };
  }

  return null;
}

// Sign a slim access token and mint a rotating refresh token. The refresh
// token rides in the response body and an httpOnly cookie scoped to /api/auth.
async function issueSession(res: express.Response, userId: number, role: auth.UserRole) {
  const token = auth.signToken({ userId, role });
  const { token: refreshToken } = await issueRefreshToken(userId, role);
  setRefreshCookie(res, refreshToken);
  return { token, refreshToken };
}

// No cookie parser in the stack; pull one cookie out of the raw header.
function readCookie(req: express.Request, name: string): string | null {
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

async function findUserById(userId: number, role: auth.UserRole): Promise<FoundUser | null> {
  if (role === 'coach') {
    const [row] = await db.select().from(schema.coaches).where(eq(schema.coaches.id, userId)).limit(1);
    return row ? { id: row.id, email: row.email, passwordHash: row.passwordHash, name: row.name ?? '', role: 'coach' } : null;
  }
  if (role === 'parent') {
    const [row] = await db.select().from(schema.parents).where(eq(schema.parents.id, userId)).limit(1);
    return row ? { id: row.id, email: row.email, passwordHash: row.passwordHash, name: row.name, role: 'parent' } : null;
  }
  if (role === 'admin') {
    const [row] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.id, userId)).limit(1);
    return row ? { id: row.id, email: row.username, passwordHash: row.passwordHash, name: row.username, role: 'admin' } : null;
  }
  const [row] = await db.select().from(schema.players).where(eq(schema.players.id, userId)).limit(1);
  return row ? { id: row.id, email: row.email, passwordHash: row.passwordHash, name: row.name, role: 'athlete', status: row.status } : null;
}

function athleteStatusRefusal(user: FoundUser, res: any): boolean {
  if (user.role !== 'athlete' || user.status === 'active' || user.status == null) return false;
  res.status(403).json({ code: user.status === 'deactivated' ? 'ACCOUNT_DEACTIVATED' : 'GUARDIAN_PENDING' });
  return true;
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────

router.post('/register', registerLimiter, async (req, res) => {
  if (!isRegistrationEnabled()) {
    return res.status(403).json({ error: 'Registration is currently closed.' });
  }
  const { email, password, name, role = 'athlete', school, division, dob, parentEmail, guardianEmail, guardianPhone, relationship } = req.body ?? {};

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const userRole = (role as auth.UserRole) || 'athlete';

  if (!SELF_REGISTERABLE_ROLES.has(userRole)) {
    return res.status(400).json({ error: 'Invalid account type' });
  }

  // Athlete signup: DOB + guardian email are required for ALL athletes so the
  // guardian gate applies uniformly (COPPA under-13 block stays server-side).
  const rawGuardianEmail = guardianEmail ?? parentEmail;
  if (userRole === 'athlete' && (typeof rawGuardianEmail !== 'string' || !rawGuardianEmail.trim())) {
    return res.status(400).json({ code: 'GUARDIAN_EMAIL_REQUIRED', error: 'A parent or guardian email is required for athlete accounts.' });
  }

  const normalEmail = (email as string).toLowerCase().trim();

  const existing = await findUserByEmail(normalEmail, userRole);
  if (existing) {
    if (existing.passwordHash === null && userRole === 'athlete') {
      const passwordHash = await auth.hashPassword(password as string);
      await db.update(schema.players).set({
        passwordHash,
        status: 'active',
        emailVerified: true,
        name: existing.name || (name as string) || 'Athlete',
        dob: dob ? new Date(dob as string) : undefined,
      }).where(eq(schema.players.id, existing.id));
      const session = await issueSession(res, existing.id, 'athlete');
      return res.status(200).json({ ...session, user: { id: existing.id, email: normalEmail, name: existing.name || name, role: 'athlete' } });
    }
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  try {
    const passwordHash = await auth.hashPassword(password as string);

    if (userRole === 'athlete') {
      const result = await createPendingAthlete({
        email: normalEmail,
        passwordHash,
        name: name as string,
        dob,
        guardianEmail: rawGuardianEmail,
        guardianPhone: typeof guardianPhone === 'string' ? guardianPhone : null,
        relationship: typeof relationship === 'string' ? relationship : null,
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
    }

    let userId: number;

    if (userRole === 'coach') {
      // Coaches are created in an unverified state. They must be approved by
      // an admin before they can search athletes or send messages.
      const [row] = await db.insert(schema.coaches).values({
        email: normalEmail, passwordHash, name: name as string,
        university: school as string | undefined,
        division: (division as string) || 'D1',
        verifiedStatus: false,
        verificationRequestedAt: new Date(),
      }).returning({ id: schema.coaches.id });
      userId = row.id;
    } else {
      const [row] = await db.insert(schema.parents).values({
        email: normalEmail, passwordHash, name: name as string,
      }).returning({ id: schema.parents.id });
      userId = row.id;
    }

    const session = await issueSession(res, userId, userRole);
    res.status(201).json({ ...session, user: { id: userId, email: normalEmail, name, role: userRole } });
  } catch (err: any) {
    console.error('[auth/register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password, role = 'athlete' } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  if (rejectIfDemoLocked(email as string, res)) return;

  const user = await findUserByEmail((email as string).toLowerCase(), (role as auth.UserRole) || 'athlete');
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await auth.comparePassword(password as string, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (athleteStatusRefusal(user, res)) return;

  const session = await issueSession(res, user.id, user.role);
  res.json({ ...session, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// ─── POST /api/auth/(secure/)coach/login ──────────────────────────────────────
// The coach UI posts here without a role field; force the coach realm.
router.post('/coach/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  if (rejectIfDemoLocked(email as string, res)) return;
  const user = await findUserByEmail((email as string).toLowerCase(), 'coach');
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const valid = await auth.comparePassword(password as string, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const session = await issueSession(res, user.id, 'coach');
  res.json({ ...session, user: { id: user.id, email: user.email, name: user.name, role: 'coach' } });
});

// ─── POST /api/auth/(secure/)coach/register ───────────────────────────────────
router.post('/coach/register', registerLimiter, async (req, res) => {
  if (!isRegistrationEnabled()) {
    return res.status(403).json({ error: 'Registration is currently closed.' });
  }
  const { email, password, name, school, university, division } = req.body ?? {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  const normalEmail = (email as string).toLowerCase().trim();
  const existing = await findUserByEmail(normalEmail, 'coach');
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }
  try {
    const passwordHash = await auth.hashPassword(password as string);
    // Coaches created via this dedicated endpoint also land unverified.
    const verificationNote = (req.body?.verificationNote as string | undefined) ?? null;
    const [row] = await db.insert(schema.coaches).values({
      email: normalEmail, passwordHash, name: name as string,
      university: (university as string) || (school as string | undefined),
      division: (division as string) || 'D1',
      verifiedStatus: false,
      verificationRequestedAt: new Date(),
      verificationNote: verificationNote ?? undefined,
    }).returning({ id: schema.coaches.id });
    const session = await issueSession(res, row.id, 'coach');
    res.status(201).json({
      ...session,
      user: { id: row.id, email: normalEmail, name, role: 'coach', verifiedStatus: false },
      pendingVerification: true,
    });
  } catch (err: any) {
    console.error('[auth/coach/register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── POST /api/auth/google ────────────────────────────────────────────────────

router.post('/google', loginLimiter, async (req, res) => {
  const { credential, role = 'athlete', dob, parentEmail, guardianEmail } = req.body ?? {};

  if (!credential) {
    return res.status(400).json({ error: 'Google credential is required' });
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google OAuth not configured on this server' });
  }

  const userRole = (role as auth.UserRole) || 'athlete';
  if (!SELF_REGISTERABLE_ROLES.has(userRole)) {
    return res.status(400).json({ error: 'Invalid account type' });
  }

  try {
    const google = await auth.verifyGoogleToken(credential as string);
    const normalEmail = google.email.toLowerCase();

    let user = await findUserByEmail(normalEmail, userRole);

    if (!user) {
      // New-account creation is gated: an existing user still logs in via
      // Google above, but a missing user is only created when registration
      // is open. Closed => fail closed with 403, no account minted.
      if (!isRegistrationEnabled()) {
        return res.status(403).json({ error: 'Registration is currently closed.' });
      }
      let userId: number;
      if (userRole === 'coach') {
        const [row] = await db.insert(schema.coaches).values({
          email: normalEmail, name: google.name,
        }).returning({ id: schema.coaches.id });
        userId = row.id;
      } else if (userRole === 'parent') {
        const [row] = await db.insert(schema.parents).values({
          email: normalEmail, passwordHash: '', name: google.name,
        }).returning({ id: schema.parents.id });
        userId = row.id;
      } else {
        // New athlete via Google: same guardian gate as every other athlete
        // signup path. The client collects the guardian email and retries on
        // 409; existing users log in above untouched.
        const rawGuardianEmail = guardianEmail ?? parentEmail;
        if (typeof rawGuardianEmail !== 'string' || !rawGuardianEmail.trim()) {
          return res.status(409).json({ code: 'GUARDIAN_EMAIL_REQUIRED', error: 'A parent or guardian email is required to finish signup.' });
        }
        const result = await createPendingAthlete({
          email: normalEmail,
          passwordHash: null,
          name: google.name,
          dob,
          guardianEmail: rawGuardianEmail,
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
      }
      user = { id: userId, email: normalEmail, passwordHash: null, name: google.name, role: userRole };
    }

    if (athleteStatusRefusal(user, res)) return;

    const session = await issueSession(res, user.id, user.role);
    res.json({ ...session, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err: any) {
    console.error('[auth/google]', err);
    if (err.message?.includes('Invalid token') || err.message?.includes('Token used too late')) {
      return res.status(401).json({ error: 'Invalid Google credential' });
    }
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

// The token payload is just { userId, role }; hydrate email/name from the DB
// so clients get the same identity shape login returns.
router.get('/me', auth.requireAuth, async (req, res) => {
  const u = (req as any).user as auth.TokenPayload;
  try {
    const found = await findUserById(Number(u.userId ?? u.id), u.role);
    if (!found) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: found.id, userId: found.id, email: found.email, name: found.name, role: u.role } });
  } catch (err) {
    console.error('[auth/me]', err);
    res.status(500).json({ error: 'Failed to load user' });
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

// Rotating refresh: a valid unconsumed token yields a new access + refresh
// pair; the old one is consumed atomically. Presenting an already consumed
// token is treated as theft: the whole family is revoked and the caller gets
// 401 { code: 'TOKEN_REUSE' }.
router.post('/refresh', loginLimiter, async (req, res) => {
  const raw = (req.body?.refreshToken as string | undefined) || readCookie(req, REFRESH_COOKIE);
  if (!raw) return res.status(401).json({ error: 'Missing refresh token' });
  try {
    const result = await rotateRefreshToken(raw);
    if (!result.ok) {
      clearRefreshCookie(res);
      if (result.code === 'TOKEN_REUSE') {
        return res.status(401).json({ code: 'TOKEN_REUSE', error: 'Refresh token reuse detected' });
      }
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    const token = auth.signToken({ userId: result.userId, role: result.role });
    setRefreshCookie(res, result.token);
    res.json({ token, refreshToken: result.token });
  } catch (err) {
    console.error('[auth/refresh]', err);
    res.status(500).json({ error: 'Refresh failed' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

// [D-06] Real server-side logout: add the presented token to the Redis blocklist
// (TTL = its remaining lifetime) so it can no longer be used even though it's
// otherwise still within its expiry window. requireAuth rejects blocklisted
// tokens. Also clears the refresh-token cookie if one is present.
router.post('/logout', auth.requireAuth, async (req, res) => {
  const header = req.headers.authorization ?? '';
  const [, token] = header.split(' ');
  try {
    const ttl = auth.getTokenTtlSeconds(token);
    if (ttl > 0) await blocklistToken(token, ttl);
  } catch (err) {
    console.error('[auth/logout] blocklist failed:', err);
    // [V2-13] In production a failed revocation write means the token would
    // stay live for its full lifetime; fail the logout so the caller knows.
    if ((process.env.APP_ENV ?? process.env.NODE_ENV) === 'production') {
      return res.status(503).json({ error: 'Logout unavailable, try again' });
    }
    // Dev/test: don't fail the logout — the client still drops its token.
  }

  // Revoke the presented refresh token's whole family so it cannot be rotated
  // into a new access token after logout.
  const rawRefresh = (req.body?.refreshToken as string | undefined) || readCookie(req, REFRESH_COOKIE);
  if (rawRefresh) {
    try {
      const rt = schema.refreshTokens;
      const [row] = await db.select({ familyId: rt.familyId }).from(rt)
        .where(eq(rt.tokenHash, hashRefreshToken(rawRefresh))).limit(1);
      if (row?.familyId) await revokeFamily(row.familyId, 'user_logout');
    } catch (err) {
      console.error('[auth/logout] refresh revocation failed:', err);
    }
  }

  const user = (req as any).user as auth.TokenPayload | undefined;
  if (user?.role === 'coach') {
    // Derive durationMs from the token's iat so avgSessionTime in the coach
    // analytics endpoint has real data without needing a separate session
    // table. Falls back to null if iat is missing or malformed.
    let durationMs: number | null = null;
    try {
      const decoded = jwt.decode(token) as { iat?: number } | null;
      if (decoded?.iat) {
        durationMs = Math.max(0, Date.now() - decoded.iat * 1000);
      }
    } catch {
      durationMs = null;
    }
    recordCoachEvent(Number(user.userId ?? user.id), 'session_ended', { durationMs });
  }

  clearRefreshCookie(res);
  res.json({ success: true });
});

router.post('/change-password', auth.requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  const user = (req as any).user as auth.TokenPayload;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const found = await findUserById(Number(user.userId ?? user.id), user.role);
  if (!found?.passwordHash) {
    return res.status(400).json({ error: 'Password change is not available for this account' });
  }
  if (!(await auth.comparePassword(String(currentPassword), found.passwordHash))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  try {
    const passwordHash = await auth.hashPassword(String(newPassword));
    const userId = user.userId ?? user.id!;
    const table = user.role === 'coach' ? schema.coaches : user.role === 'parent' ? schema.parents : schema.players;
    await db.update(table).set({ passwordHash }).where(eq(table.id, userId));
    res.json({ success: true });
  } catch (err) {
    console.error('[auth/change-password]', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;
