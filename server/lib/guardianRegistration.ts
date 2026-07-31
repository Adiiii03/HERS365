import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { validateAthleteSignup } from './athleteGate';
import { issueCode } from './verificationCodes';
import { appendConsentAudit } from './auditChain';
import { sendGuardianConsentEmail } from '../email';

const CODE_EXPIRY_MINUTES = 15;

export type CreatePendingAthleteInput = {
  email: string;
  passwordHash: string | null;
  name: string;
  dob: unknown;
  guardianEmail: unknown;
  guardianPhone?: string | null;
  relationship?: string | null;
  emailVerified?: boolean;
  signupIp: string | null;
  signupUserAgent: string | null;
};

export type CreatePendingAthleteResult =
  | { ok: true; pendingToken: string; guardianEmailMasked: string }
  | { ok: false; code: 'VALIDATION'; error: string }
  | { ok: false; code: 'GUARDIAN_EMAIL_IS_SELF' }
  | { ok: false; code: 'CODE_LIFETIME_CAP' }
  | { ok: false; code: 'CODE_DAILY_CAP' }
  | { ok: false; code: 'CODE_RATE_LIMITED'; retryAfterSeconds?: number };

function normalize(email: string): string {
  return email.toLowerCase().trim();
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const dot = domain.lastIndexOf('.');
  const domainName = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : '';
  const maskedLocal = local.length > 1 ? `${local[0]}***${local[local.length - 1]}` : `${local[0] ?? ''}***`;
  return `${maskedLocal}@${domainName[0] ?? ''}***${tld}`;
}

export function guardianFailureResponse(
  result: Exclude<CreatePendingAthleteResult, { ok: true }>,
): { status: number; body: Record<string, unknown> } {
  switch (result.code) {
    case 'VALIDATION':
      return { status: 400, body: { error: result.error } };
    case 'GUARDIAN_EMAIL_IS_SELF':
      return { status: 400, body: { code: 'GUARDIAN_EMAIL_IS_SELF', error: 'The guardian email cannot be the same as the athlete email.' } };
    case 'CODE_LIFETIME_CAP':
      return { status: 429, body: { code: 'CODE_LIFETIME_CAP', error: 'Too many verification codes have been sent for this signup. Please contact support.' } };
    case 'CODE_DAILY_CAP':
      return { status: 429, body: { code: 'CODE_DAILY_CAP', error: 'Too many verification codes have been sent to this email today. Please try again tomorrow.' } };
    case 'CODE_RATE_LIMITED':
      return {
        status: 429,
        body: {
          code: 'CODE_RATE_LIMITED',
          error: 'A verification code was sent recently. Please wait before requesting another.',
          ...(result.retryAfterSeconds ? { retryAfterSeconds: result.retryAfterSeconds } : {}),
        },
      };
  }
}

export async function createPendingAthlete(input: CreatePendingAthleteInput): Promise<CreatePendingAthleteResult> {
  const gate = validateAthleteSignup(input.dob, input.guardianEmail);
  if (!gate.ok) return { ok: false, code: 'VALIDATION', error: gate.error };

  const rawGuardian = typeof input.guardianEmail === 'string' ? input.guardianEmail.trim() : '';
  if (!rawGuardian) {
    return { ok: false, code: 'VALIDATION', error: 'A parent or guardian email is required for athlete accounts.' };
  }

  const athleteEmail = normalize(input.email);
  const guardianEmail = normalize(rawGuardian);
  if (guardianEmail === athleteEmail) {
    return { ok: false, code: 'GUARDIAN_EMAIL_IS_SELF' };
  }
  const sameDomain = athleteEmail.split('@')[1] === guardianEmail.split('@')[1];

  const pendingToken = crypto.randomBytes(32).toString('base64url');

  const [player] = await db.insert(schema.players).values({
    email: athleteEmail,
    passwordHash: input.passwordHash,
    name: input.name,
    dob: gate.dob,
    pendingParentEmail: guardianEmail,
    phone: input.guardianPhone ?? undefined,
    emailVerified: input.emailVerified ?? false,
    status: 'pending_guardian',
    activatedAt: null,
    pendingToken,
  }).returning({ id: schema.players.id });

  let parentId: number | undefined;
  let relationId: number | undefined;
  const [existingParent] = await db.select({ id: schema.parents.id })
    .from(schema.parents)
    .where(eq(schema.parents.email, guardianEmail))
    .limit(1);
  if (existingParent) {
    parentId = existingParent.id;
    const [relation] = await db.insert(schema.parentChildRelations).values({
      parentId: existingParent.id,
      playerId: player.id,
      relationship: input.relationship || 'guardian',
      status: 'pending',
    }).returning({ id: schema.parentChildRelations.id });
    relationId = relation.id;
  }

  const issued = await issueCode({
    playerId: player.id,
    parentId,
    relationId,
    channel: 'email',
    destination: guardianEmail,
    purpose: 'link_consent',
    metadata: { signupIp: input.signupIp, signupUserAgent: input.signupUserAgent, same_domain: sameDomain },
  });

  if (!issued.ok) {
    if (relationId) {
      await db.delete(schema.parentChildRelations).where(eq(schema.parentChildRelations.id, relationId));
    }
    await db.delete(schema.players).where(eq(schema.players.id, player.id));
    if (issued.reason === 'lifetime_cap') return { ok: false, code: 'CODE_LIFETIME_CAP' };
    if (issued.reason === 'daily_cap') return { ok: false, code: 'CODE_DAILY_CAP' };
    return {
      ok: false,
      code: 'CODE_RATE_LIMITED',
      retryAfterSeconds: issued.reason === 'cooldown' ? issued.retryAfterSeconds : undefined,
    };
  }

  const linkUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/guardian-verify?token=${issued.linkToken}`;

  sendGuardianConsentEmail(guardianEmail, {
    childName: input.name,
    code: issued.code,
    linkUrl,
    expiresMinutes: CODE_EXPIRY_MINUTES,
  }).catch(() => console.error('[guardianRegistration] consent email dispatch failed'));

  const auditBase = {
    playerId: player.id,
    parentId: parentId ?? null,
    actorType: 'athlete',
    ipAddress: input.signupIp,
    userAgent: input.signupUserAgent,
  };
  await db.transaction(async (tx) => {
    await appendConsentAudit(tx, [
      { ...auditBase, action: 'code_sent', detail: { channel: 'email', purpose: 'link_consent', same_domain: sameDomain } },
      { ...auditBase, action: 'link_created', detail: { purpose: 'link_consent' } },
    ]);
  });

  return { ok: true, pendingToken, guardianEmailMasked: maskEmail(guardianEmail) };
}
