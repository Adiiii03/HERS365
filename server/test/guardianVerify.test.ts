import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { and, eq } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { issueCode } from '../lib/verificationCodes';
import { resetDb } from './helpers/db';
import { makeAthlete } from './helpers/fixtures';

vi.mock('../email', () => ({
  sendGuardianConsentEmail: vi.fn(async () => ({ success: true })),
  sendEmail: vi.fn(async () => ({ success: true })),
}));

const app = createApp();

async function makePendingAthlete() {
  return makeAthlete({
    status: 'pending_guardian',
    pendingToken: crypto.randomBytes(16).toString('base64url'),
    pendingParentEmail: 'guardian@test.local',
  });
}

async function issueConsentCode(playerId: number, metadata: Record<string, unknown> = {}) {
  const issued = await issueCode({
    playerId,
    channel: 'email',
    destination: 'guardian@test.local',
    purpose: 'link_consent',
    metadata,
  });
  if (!issued.ok || !issued.linkToken) throw new Error('issueCode failed in test setup');
  return { code: issued.code, linkToken: issued.linkToken };
}

beforeEach(async () => {
  await resetDb();
});

describe('POST /api/auth/guardian/verify', () => {
  it('activates the player with a new parent account and writes consent + audit rows', async () => {
    const player = await makePendingAthlete();
    const { code, linkToken } = await issueConsentCode(player.id);

    const res = await request(app)
      .post('/api/auth/guardian/verify')
      .send({ linkToken, code, password: 'Strongpass1', name: 'Guardian Test' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ activated: true });
    expect(JSON.stringify(res.body)).not.toMatch(/token|playerId/i);

    const updated = await db.query.players.findFirst({ where: eq(schema.players.id, player.id) });
    expect(updated?.status).toBe('active');
    expect(updated?.activatedAt).toBeTruthy();

    const parent = await db.query.parents.findFirst({
      where: eq(schema.parents.email, 'guardian@test.local'),
    });
    expect(parent).toBeTruthy();
    expect(parent?.emailVerified).toBe(true);

    const relation = await db.query.parentChildRelations.findFirst({
      where: and(
        eq(schema.parentChildRelations.playerId, player.id),
        eq(schema.parentChildRelations.parentId, parent!.id),
      ),
    });
    expect(relation?.status).toBe('verified');
    expect(relation?.verifiedAt).toBeTruthy();
    expect(relation?.consentId).toBeTruthy();

    const consent = await db.query.guardianConsents.findFirst({
      where: eq(schema.guardianConsents.playerId, player.id),
    });
    expect(consent?.consented).toBe(true);
    expect(consent?.method).toBe('email_code');
    expect(consent?.grantedBy).toBe('guardian@test.local');

    const audits = await db
      .select()
      .from(schema.consentAuditLog)
      .where(eq(schema.consentAuditLog.playerId, player.id));
    const actions = audits.map((a) => a.action);
    expect(actions).toContain('code_verified');
    expect(actions).toContain('granted');
  });

  it('rejects a wrong code with a generic 400', async () => {
    const player = await makePendingAthlete();
    const { linkToken } = await issueConsentCode(player.id);

    const res = await request(app)
      .post('/api/auth/guardian/verify')
      .send({ linkToken, code: 'WRONGCOD', password: 'Strongpass1' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ code: 'INVALID_CODE' });

    const updated = await db.query.players.findFirst({ where: eq(schema.players.id, player.id) });
    expect(updated?.status).toBe('pending_guardian');
  });

  it('requires a password before consuming the code', async () => {
    const player = await makePendingAthlete();
    const { code, linkToken } = await issueConsentCode(player.id);

    const res = await request(app)
      .post('/api/auth/guardian/verify')
      .send({ linkToken, code });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ code: 'PASSWORD_REQUIRED' });

    const retry = await request(app)
      .post('/api/auth/guardian/verify')
      .send({ linkToken, code, password: 'Strongpass1' });
    expect(retry.status).toBe(200);
  });

  it('flags self approval when the guardian user agent matches signup metadata', async () => {
    const player = await makePendingAthlete();
    const { code, linkToken } = await issueConsentCode(player.id, {
      signupIp: '10.9.9.9',
      signupUserAgent: 'suzy-signup-agent',
    });

    const res = await request(app)
      .post('/api/auth/guardian/verify')
      .set('User-Agent', 'suzy-signup-agent')
      .send({ linkToken, code, password: 'Strongpass1' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ activated: true });

    const consent = await db.query.guardianConsents.findFirst({
      where: eq(schema.guardianConsents.playerId, player.id),
    });
    expect((consent?.metadata as Record<string, unknown>)?.self_approval_suspected).toBe(true);

    const audits = await db
      .select()
      .from(schema.consentAuditLog)
      .where(eq(schema.consentAuditLog.playerId, player.id));
    expect(audits.map((a) => a.action)).toContain('self_approval_flagged');

    const updated = await db.query.players.findFirst({ where: eq(schema.players.id, player.id) });
    expect(updated?.status).toBe('active');
  });
});

describe('POST /api/auth/guardian/resend', () => {
  it('returns 429 with retryAfterSeconds when inside the cooldown', async () => {
    const player = await makePendingAthlete();
    await issueConsentCode(player.id);

    const res = await request(app)
      .post('/api/auth/guardian/resend')
      .send({ pendingToken: player.pendingToken });

    expect(res.status).toBe(429);
    expect(res.body.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('returns a generic 200 for an unknown pendingToken', async () => {
    const res = await request(app)
      .post('/api/auth/guardian/resend')
      .send({ pendingToken: 'does-not-exist' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('GET /api/auth/guardian/status', () => {
  it('returns only a status field and defaults unknown tokens to pending_guardian', async () => {
    const player = await makePendingAthlete();

    const pending = await request(app)
      .get('/api/auth/guardian/status')
      .query({ pendingToken: player.pendingToken });
    expect(pending.status).toBe(200);
    expect(pending.body).toEqual({ status: 'pending_guardian' });

    const unknown = await request(app)
      .get('/api/auth/guardian/status')
      .query({ pendingToken: 'nope' });
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual({ status: 'pending_guardian' });

    const { code, linkToken } = await issueConsentCode(player.id);
    await request(app)
      .post('/api/auth/guardian/verify')
      .send({ linkToken, code, password: 'Strongpass1' });

    const active = await request(app)
      .get('/api/auth/guardian/status')
      .query({ pendingToken: player.pendingToken });
    expect(active.body).toEqual({ status: 'active' });
  });
});
