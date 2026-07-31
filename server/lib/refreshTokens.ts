import crypto from 'crypto';
import { and, eq } from 'drizzle-orm';
import type { Response } from 'express';
import { db } from '../db';
import * as schema from '../schema';
import type { UserRole } from '../auth';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const REFRESH_COOKIE = 'refreshToken';
// Scoped to the auth router so the cookie only travels to refresh/logout.
export const REFRESH_COOKIE_PATH = '/api/auth';

export function refreshCookieOptions() {
  return {
    httpOnly: true as const,
    secure: (process.env.APP_ENV ?? process.env.NODE_ENV) === 'production',
    sameSite: 'lax' as const,
    path: REFRESH_COOKIE_PATH,
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, { ...refreshCookieOptions(), maxAge: REFRESH_TTL_MS });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
}

export function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function issueRefreshToken(
  userId: number,
  role: UserRole,
  familyId?: string,
): Promise<{ token: string; familyId: string }> {
  const token = crypto.randomBytes(32).toString('hex');
  const family = familyId ?? crypto.randomUUID();
  await db.insert(schema.refreshTokens).values({
    userId,
    userType: role,
    tokenHash: hashRefreshToken(token),
    familyId: family,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return { token, familyId: family };
}

export async function revokeFamily(familyId: string, reason: string): Promise<void> {
  await db
    .update(schema.refreshTokens)
    .set({ isRevoked: true, revokedAt: new Date(), revokedReason: reason })
    .where(eq(schema.refreshTokens.familyId, familyId));
}

export type RotationResult =
  | { ok: true; userId: number; role: UserRole; token: string }
  | { ok: false; code: 'INVALID' | 'TOKEN_REUSE' };

export async function rotateRefreshToken(raw: string): Promise<RotationResult> {
  const tokenHash = hashRefreshToken(raw);
  const rt = schema.refreshTokens;
  const [row] = await db.select().from(rt).where(eq(rt.tokenHash, tokenHash)).limit(1);
  if (!row) return { ok: false, code: 'INVALID' };

  if (row.isRevoked) {
    // Reuse of an already consumed token: assume theft, kill the whole family.
    if (row.familyId) await revokeFamily(row.familyId, 'suspicious_activity');
    return { ok: false, code: 'TOKEN_REUSE' };
  }
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
    return { ok: false, code: 'INVALID' };
  }

  // Atomic consume: the WHERE isRevoked = false guard means only one of two
  // racing requests wins; the loser is treated as reuse.
  const consumed = await db
    .update(rt)
    .set({ isRevoked: true, revokedAt: new Date(), revokedReason: 'rotated', lastUsedAt: new Date() })
    .where(and(eq(rt.tokenHash, tokenHash), eq(rt.isRevoked, false)))
    .returning({ id: rt.id });
  if (consumed.length === 0) {
    if (row.familyId) await revokeFamily(row.familyId, 'suspicious_activity');
    return { ok: false, code: 'TOKEN_REUSE' };
  }

  const next = await issueRefreshToken(row.userId, row.userType as UserRole, row.familyId ?? undefined);
  return { ok: true, userId: row.userId, role: row.userType as UserRole, token: next.token };
}
