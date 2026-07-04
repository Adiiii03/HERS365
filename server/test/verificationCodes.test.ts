import { describe, it, expect, beforeEach } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { guardianVerificationCodes as gvc } from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete } from './helpers/fixtures';
import { issueCode, verifyCode, expireOthers, hashCode } from '../lib/verificationCodes';

let playerId: number;

beforeEach(async () => {
  await resetDb();
  const athlete = await makeAthlete();
  playerId = athlete.id;
});

const emailIssue = (overrides = {}) =>
  issueCode({
    playerId,
    channel: 'email',
    destination: 'guardian@test.local',
    purpose: 'link_consent',
    ...overrides,
  });

async function backdateAll(interval: string) {
  await db.update(gvc).set({ createdAt: sql.raw(`now() - interval '${interval}'`) as never });
}

describe('verificationCodes', () => {
  it('issue then verify roundtrip (link_consent, 8-char unambiguous code + linkToken)', async () => {
    const issued = await emailIssue();
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    expect(issued.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    expect(issued.linkToken).toBeTruthy();

    const result = await verifyCode({
      linkToken: issued.linkToken,
      purpose: 'link_consent',
      channel: 'email',
      code: issued.code,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.row.used).toBe(true);
    expect(result.row.consumedAt).toBeTruthy();
  });

  it('sms phone_verify issues a 6-digit numeric code with no linkToken', async () => {
    const issued = await issueCode({
      playerId,
      channel: 'sms',
      destination: '+15555550100',
      purpose: 'phone_verify',
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    expect(issued.code).toMatch(/^\d{6}$/);
    expect(issued.linkToken).toBeUndefined();
  });

  it('wrong code increments attempts and locks at max_attempts', async () => {
    const issued = await emailIssue();
    if (!issued.ok) throw new Error('issue failed');

    for (let i = 1; i <= 5; i++) {
      const result = await verifyCode({
        playerId,
        purpose: 'link_consent',
        channel: 'email',
        code: 'WRONGXYZ',
      });
      expect(result).toEqual({ ok: false, reason: 'mismatch' });
      const [row] = await db.select().from(gvc).where(eq(gvc.playerId, playerId));
      expect(row.attempts).toBe(i);
    }

    const locked = await verifyCode({
      playerId,
      purpose: 'link_consent',
      channel: 'email',
      code: issued.code,
    });
    expect(locked).toEqual({ ok: false, reason: 'locked' });
  });

  it('equal-length wrong hash goes through timingSafeEqual and mismatches', async () => {
    const issued = await emailIssue();
    if (!issued.ok) throw new Error('issue failed');
    const wrong = issued.code === 'AAAAAAAA' ? 'BBBBBBBB' : 'AAAAAAAA';
    expect(hashCode(wrong)).toHaveLength(hashCode(issued.code).length);
    const result = await verifyCode({
      linkToken: issued.linkToken,
      purpose: 'link_consent',
      channel: 'email',
      code: wrong,
    });
    expect(result).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('rejects an expired code', async () => {
    const issued = await emailIssue();
    if (!issued.ok) throw new Error('issue failed');
    await db.update(gvc).set({ expiresAt: sql`now() - interval '1 minute'` as never });

    const byToken = await verifyCode({
      linkToken: issued.linkToken,
      purpose: 'link_consent',
      channel: 'email',
      code: issued.code,
    });
    expect(byToken).toEqual({ ok: false, reason: 'expired' });

    const byPlayer = await verifyCode({
      playerId,
      purpose: 'link_consent',
      channel: 'email',
      code: issued.code,
    });
    expect(byPlayer).toEqual({ ok: false, reason: 'not_found' });
  });

  it('enforces the 60s resend cooldown with retryAfterSeconds', async () => {
    const first = await emailIssue();
    expect(first.ok).toBe(true);
    const second = await emailIssue();
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe('cooldown');
    if (second.reason !== 'cooldown') return;
    expect(second.retryAfterSeconds).toBeGreaterThan(0);
    expect(second.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('resend invalidates the prior code and prior link_token', async () => {
    const first = await emailIssue();
    if (!first.ok) throw new Error('issue failed');
    await backdateAll('61 seconds');

    const second = await emailIssue();
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const oldByToken = await verifyCode({
      linkToken: first.linkToken,
      purpose: 'link_consent',
      channel: 'email',
      code: first.code,
    });
    expect(oldByToken).toEqual({ ok: false, reason: 'already_used' });

    const fresh = await verifyCode({
      linkToken: second.linkToken,
      purpose: 'link_consent',
      channel: 'email',
      code: second.code,
    });
    expect(fresh.ok).toBe(true);
  });

  it('enforces the hourly cap of 4 per (player, purpose)', async () => {
    for (let i = 0; i < 4; i++) {
      const issued = await emailIssue({ destination: `g${i}@test.local` });
      expect(issued.ok).toBe(true);
      await backdateAll('2 minutes');
    }
    const fifth = await emailIssue({ destination: 'g5@test.local' });
    expect(fifth).toEqual({ ok: false, reason: 'hourly_cap' });
  });

  it('enforces the lifetime cap per (player, purpose)', async () => {
    for (let i = 0; i < 10; i++) {
      await db.insert(gvc).values({
        playerId,
        channel: 'email',
        destination: `g${i}@test.local`,
        purpose: 'link_consent',
        codeHash: hashCode(`CODE${i}`),
        used: true,
        expiresAt: sql`now() - interval '1 day'` as never,
        createdAt: sql`now() - interval '2 days'` as never,
      });
    }
    const capped = await emailIssue();
    expect(capped).toEqual({ ok: false, reason: 'lifetime_cap' });
  });

  it('enforces the per-destination daily cap', async () => {
    for (let i = 0; i < 5; i++) {
      await db.insert(gvc).values({
        playerId,
        channel: 'email',
        destination: 'same@test.local',
        purpose: `email_verify`,
        codeHash: hashCode(`CODE${i}`),
        used: true,
        expiresAt: sql`now() - interval '1 hour'` as never,
        createdAt: sql`now() - interval '2 hours'` as never,
      });
    }
    const other = await makeAthlete();
    const capped = await issueCode({
      playerId: other.id,
      channel: 'email',
      destination: 'same@test.local',
      purpose: 'link_consent',
    });
    expect(capped).toEqual({ ok: false, reason: 'lifetime_cap' });
  });

  it('replay of a used code fails', async () => {
    const issued = await emailIssue();
    if (!issued.ok) throw new Error('issue failed');
    const args = {
      linkToken: issued.linkToken,
      purpose: 'link_consent' as const,
      channel: 'email' as const,
      code: issued.code,
    };
    const first = await verifyCode(args);
    expect(first.ok).toBe(true);
    const replay = await verifyCode(args);
    expect(replay).toEqual({ ok: false, reason: 'already_used' });
  });

  it('expireOthers invalidates all unused codes for (player, purpose)', async () => {
    const issued = await emailIssue();
    if (!issued.ok) throw new Error('issue failed');
    await expireOthers(playerId, 'link_consent');

    const [row] = await db
      .select()
      .from(gvc)
      .where(and(eq(gvc.playerId, playerId), eq(gvc.purpose, 'link_consent')));
    expect(row.used).toBe(true);
    expect(row.consumedAt).toBeTruthy();

    const result = await verifyCode({
      linkToken: issued.linkToken,
      purpose: 'link_consent',
      channel: 'email',
      code: issued.code,
    });
    expect(result).toEqual({ ok: false, reason: 'already_used' });
  });
});
