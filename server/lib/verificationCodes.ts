import crypto from 'crypto';
import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { db } from '../db';
import { guardianVerificationCodes } from '../schema';

export type CodeChannel = 'email' | 'sms';
export type CodePurpose = 'link_consent' | 'email_verify' | 'phone_verify' | 'password_reset';

const isProduction =
  process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';
if (isProduction && !process.env.CODE_PEPPER) {
  throw new Error('CODE_PEPPER must be set in production');
}
// Dev/test fallback keeps local setups working; the throw above guarantees the
// real secret in production, where a shared pepper would defeat the HMAC.
const CODE_PEPPER = process.env.CODE_PEPPER || 'hers365-dev-code-pepper';

const EMAIL_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const EXPIRY_MINUTES = 15;
const COOLDOWN_SECONDS = 60;
const HOURLY_CAP = 4;
const LIFETIME_CAP_PER_PLAYER_PURPOSE = 10;
const DAILY_CAP_PER_DESTINATION = 5;

export function hashCode(code: string): string {
  return crypto.createHmac('sha256', CODE_PEPPER).update(code).digest('hex');
}

function codesMatch(candidate: string, storedHash: string): boolean {
  const a = Buffer.from(hashCode(candidate), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function generateCode(purpose: CodePurpose): string {
  if (purpose === 'phone_verify') {
    let code = '';
    for (let i = 0; i < 6; i++) code += crypto.randomInt(10).toString();
    return code;
  }
  let code = '';
  for (let i = 0; i < 8; i++) code += EMAIL_ALPHABET[crypto.randomInt(EMAIL_ALPHABET.length)];
  return code;
}

export type IssueCodeInput = {
  playerId: number;
  parentId?: number;
  relationId?: number;
  channel: CodeChannel;
  destination: string;
  purpose: CodePurpose;
  metadata?: Record<string, unknown>;
};

export type IssueCodeResult =
  | { ok: true; code: string; linkToken?: string }
  | { ok: false; reason: 'lifetime_cap' | 'hourly_cap' }
  | { ok: false; reason: 'cooldown'; retryAfterSeconds: number };

const gvc = guardianVerificationCodes;

export async function issueCode(input: IssueCodeInput): Promise<IssueCodeResult> {
  const { playerId, parentId, relationId, channel, destination, purpose, metadata } = input;

  const [lifetime] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(gvc)
    .where(and(eq(gvc.playerId, playerId), eq(gvc.purpose, purpose)));
  if (lifetime.count >= LIFETIME_CAP_PER_PLAYER_PURPOSE) {
    return { ok: false, reason: 'lifetime_cap' };
  }

  const [daily] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(gvc)
    .where(and(eq(gvc.destination, destination), gt(gvc.createdAt, sql`now() - interval '24 hours'`)));
  if (daily.count >= DAILY_CAP_PER_DESTINATION) {
    return { ok: false, reason: 'lifetime_cap' };
  }

  const [recent] = await db
    .select({ elapsed: sql<number>`extract(epoch from now() - ${gvc.createdAt})::int` })
    .from(gvc)
    .where(
      and(
        eq(gvc.playerId, playerId),
        eq(gvc.purpose, purpose),
        eq(gvc.channel, channel),
        eq(gvc.used, false),
        gt(gvc.expiresAt, sql`now()`),
        gt(gvc.createdAt, sql`now() - interval '${sql.raw(String(COOLDOWN_SECONDS))} seconds'`),
      ),
    )
    .orderBy(desc(gvc.createdAt))
    .limit(1);
  if (recent) {
    return { ok: false, reason: 'cooldown', retryAfterSeconds: Math.max(1, COOLDOWN_SECONDS - recent.elapsed) };
  }

  const [hourly] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(gvc)
    .where(and(eq(gvc.playerId, playerId), eq(gvc.purpose, purpose), gt(gvc.createdAt, sql`now() - interval '1 hour'`)));
  if (hourly.count >= HOURLY_CAP) {
    return { ok: false, reason: 'hourly_cap' };
  }

  await db
    .update(gvc)
    .set({ used: true, consumedAt: sql`now()` })
    .where(and(eq(gvc.playerId, playerId), eq(gvc.purpose, purpose), eq(gvc.channel, channel), eq(gvc.used, false)));

  const code = generateCode(purpose);
  const linkToken = purpose === 'link_consent' ? crypto.randomBytes(32).toString('base64url') : undefined;

  await db.insert(gvc).values({
    playerId,
    parentId,
    relationId,
    channel,
    destination,
    purpose,
    codeHash: hashCode(code),
    linkToken,
    metadata: metadata ?? {},
    expiresAt: sql`now() + interval '${sql.raw(String(EXPIRY_MINUTES))} minutes'`,
  });

  return linkToken ? { ok: true, code, linkToken } : { ok: true, code };
}

export type VerifyCodeInput = {
  linkToken?: string;
  playerId?: number;
  purpose: CodePurpose;
  channel: CodeChannel;
  code: string;
};

export type VerifyCodeResult =
  | { ok: true; row: typeof gvc.$inferSelect }
  | { ok: false; reason: 'not_found' | 'expired' | 'locked' | 'mismatch' | 'already_used' };

export async function verifyCode(input: VerifyCodeInput): Promise<VerifyCodeResult> {
  const { linkToken, playerId, purpose, channel, code } = input;

  const where = linkToken
    ? and(eq(gvc.linkToken, linkToken), eq(gvc.purpose, purpose), eq(gvc.channel, channel))
    : and(
        eq(gvc.playerId, playerId ?? -1),
        eq(gvc.purpose, purpose),
        eq(gvc.channel, channel),
        eq(gvc.used, false),
        gt(gvc.expiresAt, sql`now()`),
      );

  const [candidate] = await db
    .select({ row: gvc, isExpired: sql<boolean>`${gvc.expiresAt} <= now()` })
    .from(gvc)
    .where(where)
    .orderBy(desc(gvc.createdAt))
    .limit(1);

  if (!candidate) return { ok: false, reason: 'not_found' };
  const { row, isExpired } = candidate;
  if (row.used) return { ok: false, reason: 'already_used' };
  if (isExpired) return { ok: false, reason: 'expired' };
  if (row.attempts >= row.maxAttempts) return { ok: false, reason: 'locked' };

  if (!codesMatch(code, row.codeHash)) {
    await db
      .update(gvc)
      .set({ attempts: sql`${gvc.attempts} + 1` })
      .where(eq(gvc.id, row.id))
      .returning({ attempts: gvc.attempts });
    return { ok: false, reason: 'mismatch' };
  }

  // Replay guard: the WHERE used=false makes consumption atomic — two
  // concurrent verifies cannot both win the same code.
  const [consumed] = await db
    .update(gvc)
    .set({ used: true, consumedAt: sql`now()` })
    .where(and(eq(gvc.id, row.id), eq(gvc.used, false)))
    .returning();
  if (!consumed) return { ok: false, reason: 'already_used' };

  return { ok: true, row: consumed };
}

export async function expireOthers(playerId: number, purpose: CodePurpose): Promise<void> {
  await db
    .update(gvc)
    .set({ used: true, consumedAt: sql`now()` })
    .where(and(eq(gvc.playerId, playerId), eq(gvc.purpose, purpose), eq(gvc.used, false)));
}
