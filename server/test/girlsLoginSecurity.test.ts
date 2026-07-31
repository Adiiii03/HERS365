import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { resetDb } from './helpers/db';
import { makeAthlete, tokenFor } from './helpers/fixtures';

const app = createApp();
const PASSWORD = 'Test-pw-123';
const loginPaths = ['/api/auth/login', '/api/auth/email/login'] as const;

beforeEach(resetDb);

function decodePayload(token: string) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
}

function assertNoTokenOrUser(body: Record<string, unknown>) {
  expect(body.token).toBeUndefined();
  expect(body.refreshToken).toBeUndefined();
  expect(body.user).toBeUndefined();
}

describe('girls rollout login security', () => {
  it('lets an active mock girl log in without leaking sensitive profile or token fields', async () => {
    const athlete = await makeAthlete({
      email: 'maya-rollout@test.local',
      name: 'Maya Johnson',
      dob: new Date('2009-05-14T00:00:00.000Z'),
      pendingParentEmail: 'maya.guardian@test.local',
      zipCode: '90011',
      phone: '555-0101',
      gradYear: 2027,
      position: 'QB',
      state: 'CA',
      city: 'Los Angeles',
    });

    for (const path of loginPaths) {
      const res = await request(app)
        .post(path)
        .send({ email: athlete.email, password: PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeTypeOf('string');
      expect(res.body.user.id).toBe(athlete.id);
      expect(res.body.user.email).toBe(athlete.email);

      const payload = decodePayload(res.body.token);
      expect(payload.userId).toBe(athlete.id);
      expect(payload.role).toBe('athlete');
      expect(payload.email).toBeUndefined();
      expect(payload.name).toBeUndefined();
      expect(payload.dob).toBeUndefined();
      expect(payload.zipCode).toBeUndefined();
      expect(payload.pendingParentEmail).toBeUndefined();
      expect(payload.passwordHash).toBeUndefined();

      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('passwordHash');
      expect(serialized).not.toContain('password_hash');
      expect(serialized).not.toContain('90011');
      expect(serialized).not.toContain('555-0101');
      expect(serialized).not.toContain('maya.guardian@test.local');
      expect(serialized).not.toContain('2009-05-14');
    }
  });

  it('blocks a guardian-pending mock girl with no session material', async () => {
    const athlete = await makeAthlete({
      email: 'pending-girl-rollout@test.local',
      name: 'Pending Athlete',
      status: 'pending_guardian',
    });

    for (const path of loginPaths) {
      const res = await request(app)
        .post(path)
        .send({ email: athlete.email, password: PASSWORD });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ code: 'GUARDIAN_PENDING' });
      assertNoTokenOrUser(res.body);
    }
  });

  it('does not reveal guardian status when the password is wrong', async () => {
    const athlete = await makeAthlete({
      email: 'pending-wrong-password@test.local',
      status: 'pending_guardian',
    });

    for (const path of loginPaths) {
      const res = await request(app)
        .post(path)
        .send({ email: athlete.email, password: 'Wrong-pw-123' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid credentials' });
      assertNoTokenOrUser(res.body);
    }
  });

  it('uses the same generic response for unknown emails and wrong passwords', async () => {
    const athlete = await makeAthlete({ email: 'known-girl@test.local' });

    for (const path of loginPaths) {
      const wrongPassword = await request(app)
        .post(path)
        .send({ email: athlete.email, password: 'Wrong-pw-123' });
      const unknownEmail = await request(app)
        .post(path)
        .send({ email: 'unknown-girl@test.local', password: PASSWORD });

      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(wrongPassword.body).toEqual({ error: 'Invalid credentials' });
      expect(unknownEmail.body).toEqual({ error: 'Invalid credentials' });
      assertNoTokenOrUser(wrongPassword.body);
      assertNoTokenOrUser(unknownEmail.body);
    }
  });

  it('rejects a forged pending-athlete token at protected routes', async () => {
    const athlete = await makeAthlete({
      email: 'pending-token-forged@test.local',
      status: 'pending_guardian',
    });
    const token = tokenFor(athlete, 'athlete');

    const res = await request(app)
      .get('/api/messages/conversations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ code: 'GUARDIAN_PENDING' });
  });
});
