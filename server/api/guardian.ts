import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { issueCode, verifyCode } from '../lib/verificationCodes';
import { sendGuardianConsentEmail } from '../email';

export const guardianRouter = express.Router();

const BCRYPT_ROUNDS = 12;
const CONSENT_VERSION = 'v1-2026-07';
const CONSENT_TEXT =
  'By entering this code you are approving your child joining HERS365 and creating your parent account.';

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => {
    const raw = Number(process.env.GUARDIAN_VERIFY_RATE_LIMIT_MAX);
    return Number.isFinite(raw) && raw > 0 ? raw : 10;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts — try again later' },
});

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => {
    const raw = Number(process.env.GUARDIAN_RESEND_RATE_LIMIT_MAX);
    return Number.isFinite(raw) && raw > 0 ? raw : 10;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — try again later' },
});

const statusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — try again later' },
});

export const _guardianLimitersForTests = {
  verify: verifyLimiter,
  resend: resendLimiter,
  status: statusLimiter,
};

guardianRouter.post('/verify', verifyLimiter, async (req, res) => {
  try {
    const { linkToken, code, password, name } = req.body ?? {};
    if (typeof linkToken !== 'string' || !linkToken || typeof code !== 'string' || !code) {
      return res.status(400).json({ code: 'INVALID_CODE' });
    }
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ code: 'PASSWORD_REQUIRED' });
    }

    // Peek the code row without consuming it so a wrong parent password does
    // not burn a correct code and force a resend.
    const peek = await db.query.guardianVerificationCodes.findFirst({
      where: eq(schema.guardianVerificationCodes.linkToken, linkToken),
    });
    let existingParent = null;
    if (peek && !peek.used) {
      existingParent = await db.query.parents.findFirst({
        where: eq(schema.parents.email, peek.destination.toLowerCase()),
      });
      if (existingParent) {
        const valid = await bcrypt.compare(password, existingParent.passwordHash);
        if (!valid) return res.status(401).json({ code: 'INVALID_CREDENTIALS' });
      }
    }

    const result = await verifyCode({ linkToken, purpose: 'link_consent', channel: 'email', code });
    if (!result.ok) {
      if (result.reason === 'expired' || result.reason === 'already_used') {
        return res.status(410).json({ code: 'CODE_EXPIRED' });
      }
      if (result.reason === 'locked') {
        return res.status(423).json({ code: 'CODE_LOCKED' });
      }
      return res.status(400).json({ code: 'INVALID_CODE' });
    }

    const codeRow = result.row;
    const guardianEmail = codeRow.destination.toLowerCase();
    const playerId = codeRow.playerId;
    if (!playerId) return res.status(400).json({ code: 'INVALID_CODE' });

    let parent = existingParent ?? await db.query.parents.findFirst({
      where: eq(schema.parents.email, guardianEmail),
    });
    if (parent) {
      const valid = await bcrypt.compare(password, parent.passwordHash);
      if (!valid) return res.status(401).json({ code: 'INVALID_CREDENTIALS' });
      await db
        .update(schema.parents)
        .set({ emailVerified: true })
        .where(eq(schema.parents.id, parent.id));
    } else {
      if (password.length < 8) {
        return res.status(400).json({ code: 'PASSWORD_REQUIRED' });
      }
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      [parent] = await db
        .insert(schema.parents)
        .values({
          email: guardianEmail,
          passwordHash,
          name: typeof name === 'string' && name.trim() ? name.trim() : 'Guardian',
          emailVerified: true,
        })
        .returning();
    }

    const ip = req.ip ?? null;
    const userAgent = req.get('user-agent') ?? null;
    const codeMeta = (codeRow.metadata ?? {}) as Record<string, unknown>;
    const selfApproval =
      (!!ip && codeMeta.signupIp === ip) ||
      (!!userAgent && codeMeta.signupUserAgent === userAgent);

    await db.transaction(async (tx) => {
      let relation = await tx.query.parentChildRelations.findFirst({
        where: and(
          eq(schema.parentChildRelations.parentId, parent!.id),
          eq(schema.parentChildRelations.playerId, playerId),
        ),
      });
      if (!relation) {
        relation = await tx.query.parentChildRelations.findFirst({
          where: and(
            eq(schema.parentChildRelations.playerId, playerId),
            eq(schema.parentChildRelations.status, 'pending'),
          ),
        });
      }
      if (relation) {
        [relation] = await tx
          .update(schema.parentChildRelations)
          .set({
            parentId: parent!.id,
            status: 'verified',
            verifiedAt: new Date(),
            relationship: relation.relationship ?? 'guardian',
          })
          .where(eq(schema.parentChildRelations.id, relation.id))
          .returning();
      } else {
        [relation] = await tx
          .insert(schema.parentChildRelations)
          .values({
            parentId: parent!.id,
            playerId,
            relationship: 'guardian',
            status: 'verified',
            verifiedAt: new Date(),
          })
          .returning();
      }

      const [consent] = await tx
        .insert(schema.guardianConsents)
        .values({
          parentId: parent!.id,
          playerId,
          consentType: 'parental',
          framework: 'parental_consent',
          consented: true,
          consentVersion: CONSENT_VERSION,
          consentText: CONSENT_TEXT,
          method: 'email_code',
          grantedBy: guardianEmail,
          ipAddress: ip,
          userAgent,
          metadata: selfApproval ? { self_approval_suspected: true } : {},
        })
        .returning();

      await tx
        .update(schema.parentChildRelations)
        .set({ consentId: consent.id })
        .where(eq(schema.parentChildRelations.id, relation!.id));

      await tx
        .update(schema.players)
        .set({ status: 'active', activatedAt: new Date() })
        .where(eq(schema.players.id, playerId));

      const auditBase = {
        consentId: consent.id,
        parentId: parent!.id,
        playerId,
        actorType: 'guardian',
        actorId: parent!.id,
        ipAddress: ip,
        userAgent,
      };
      const auditRows = [
        { ...auditBase, action: 'code_verified' },
        { ...auditBase, action: 'granted' },
      ];
      if (selfApproval) auditRows.push({ ...auditBase, action: 'self_approval_flagged' });
      await tx.insert(schema.consentAuditLog).values(auditRows);
    });

    return res.json({ activated: true });
  } catch (err) {
    console.error('guardian verify error:', err);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

guardianRouter.post('/resend', resendLimiter, async (req, res) => {
  try {
    const { pendingToken } = req.body ?? {};
    if (typeof pendingToken !== 'string' || !pendingToken) {
      return res.json({ ok: true });
    }

    const player = await db.query.players.findFirst({
      where: eq(schema.players.pendingToken, pendingToken),
    });
    if (!player || player.status !== 'pending_guardian') {
      return res.json({ ok: true });
    }

    const [lastCode] = await db
      .select()
      .from(schema.guardianVerificationCodes)
      .where(
        and(
          eq(schema.guardianVerificationCodes.playerId, player.id),
          eq(schema.guardianVerificationCodes.purpose, 'link_consent'),
        ),
      )
      .orderBy(desc(schema.guardianVerificationCodes.createdAt))
      .limit(1);

    const destination = lastCode?.destination ?? player.pendingParentEmail;
    if (!destination) return res.json({ ok: true });

    const issued = await issueCode({
      playerId: player.id,
      channel: 'email',
      destination,
      purpose: 'link_consent',
      metadata: (lastCode?.metadata as Record<string, unknown>) ?? {},
    });
    if (!issued.ok) {
      if (issued.reason === 'cooldown') {
        return res.status(429).json({ ok: false, retryAfterSeconds: issued.retryAfterSeconds });
      }
      return res.json({ ok: true });
    }

    const linkUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/guardian/verify?token=${issued.linkToken}`;
    await sendGuardianConsentEmail(destination, {
      childName: player.name,
      code: issued.code,
      linkUrl,
      expiresMinutes: 15,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('guardian resend error:', err);
    return res.json({ ok: true });
  }
});

guardianRouter.get('/status', statusLimiter, async (req, res) => {
  try {
    const pendingToken = typeof req.query.pendingToken === 'string' ? req.query.pendingToken : '';
    if (pendingToken) {
      const player = await db.query.players.findFirst({
        where: eq(schema.players.pendingToken, pendingToken),
      });
      if (player?.status === 'active') {
        return res.json({ status: 'active' });
      }
    }
    return res.json({ status: 'pending_guardian' });
  } catch (err) {
    console.error('guardian status error:', err);
    return res.json({ status: 'pending_guardian' });
  }
});
