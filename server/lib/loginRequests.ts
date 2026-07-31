import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { db } from '../db';
import { loginRequests } from '../schema';

export type LoginRequestRow = typeof loginRequests.$inferSelect;

/**
 * Returns the player's single live pending login request, or null.
 *
 * "Live" = status 'pending' AND still within its expiry window. We check
 * expiresAt > now() directly rather than trusting the status column alone, so a
 * row that has lapsed but hasn't yet been swept to 'expired' by a background job
 * is still correctly treated as not-live. Mirrors the latest-row pattern in
 * verificationCodes.ts (order by desc, limit 1): if two pending rows ever
 * overlap, surface the most recent.
 *
 * Drives the athlete's "waiting for guardian approval" screen.
 */
export async function getPendingLoginRequest(
  playerId: number,
): Promise<LoginRequestRow | null> {
  const [row] = await db
    .select()
    .from(loginRequests)
    .where(
      and(
        eq(loginRequests.playerId, playerId),
        eq(loginRequests.status, 'pending'),
        gt(loginRequests.expiresAt, sql`now()`),
      ),
    )
    .orderBy(desc(loginRequests.requestedAt))
    .limit(1);

  return row ?? null;
}
