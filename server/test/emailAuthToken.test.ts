import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { sendPasswordResetEmail, sendVerificationEmail } from '../email';
import { eq } from 'drizzle-orm';
import { resetDb } from './helpers/db';
import { activateAthlete, makeAthlete } from './helpers/fixtures';

vi.mock('../email', () => ({
  sendGuardianConsentEmail: vi.fn(async () => ({ success: true })),
  sendPasswordResetEmail: vi.fn(async () => undefined),
  sendVerificationEmail: vi.fn(async () => undefined),
  sendEmail: vi.fn(async () => undefined),
}));

async function activateByEmail(email: string) {
  const [row] = await db.select({ id: schema.players.id }).from(schema.players)
    .where(eq(schema.players.email, email)).limit(1);
  await activateAthlete(row.id);
}

const app = createApp();
beforeEach(async () => {
  await resetDb();
  vi.mocked(sendPasswordResetEmail).mockClear();
  vi.mocked(sendVerificationEmail).mockClear();
});

type DecodedToken = {
  userId?: number;
  email?: string;
  role?: string;
  name?: string;
  // pre-fix shape — should NOT appear when role/userId is missing
  id?: number;
  subscriptionTier?: string | null;
};

function decode(token: string): DecodedToken {
  return jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
}

describe('POST /api/auth/email/register', () => {
  it('returns 202 pending_guardian with no token — the guardian gate mints nothing', async () => {
    const res = await request(app)
      .post('/api/auth/email/register')
      .send({ email: 'canon-register@test.local', password: 'Password1', name: 'Canon', dob: '2000-01-01', guardianEmail: 'canon-guardian@family.local' });
    expect(res.status).toBe(202);
    expect(res.body.status).toBe('pending_guardian');
    expect(res.body.pendingToken).toBeTypeOf('string');
    expect(res.body.token).toBeUndefined();
    expect(res.body.user).toBeUndefined();
  });
});

describe('POST /api/auth/email/login', () => {
  it('mints a token in the canonical { userId, role, name, email } shape', async () => {
    const registerRes = await request(app)
      .post('/api/auth/email/register')
      .send({ email: 'canon-login@test.local', password: 'Password1', name: 'Canon Login', dob: '2000-01-01', guardianEmail: 'canon-guardian@family.local' });
    expect(registerRes.status).toBe(202);
    await activateByEmail('canon-login@test.local');

    const loginRes = await request(app)
      .post('/api/auth/email/login')
      .send({ email: 'canon-login@test.local', password: 'Password1' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTypeOf('string');

    const decoded = decode(loginRes.body.token);
    expect(decoded.userId).toBe(loginRes.body.user.id);
    expect(decoded.email).toBe('canon-login@test.local');
    expect(decoded.role).toBe('athlete');
    expect(decoded.name).toBe('Canon Login');
  });
});

describe('email-auth token works on routes that read req.user.userId / req.user.role', () => {
  it('GET /api/profile resolves the caller from req.user.userId after email-auth login', async () => {
    const email = 'profile-flow@test.local';
    await request(app)
      .post('/api/auth/email/register')
      .send({ email, password: 'Password1', name: 'Profile Flow', dob: '2000-01-01', guardianEmail: 'profile-guardian@family.local' });
    await activateByEmail(email);

    const loginRes = await request(app)
      .post('/api/auth/email/login')
      .send({ email, password: 'Password1' });
    expect(loginRes.status).toBe(200);
    const token: string = loginRes.body.token;

    const profileRes = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(profileRes.status).toBe(200);
    // The route reads req.user.userId to look up the row. If userId is
    // undefined (the pre-fix bug) this either 500s on a nullable lookup or
    // resolves to a different player. Asserting the email is the canonical
    // happy path.
    expect(profileRes.body?.email).toBe(email);
  });

  it('GET /api/notifications resolves the caller from req.user.id after email-auth login', async () => {
    const registerRes = await request(app)
      .post('/api/auth/email/register')
      .send({ email: 'notif-flow@test.local', password: 'Password1', name: 'Notif Flow', dob: '2000-01-01', guardianEmail: 'notif-guardian@family.local' });
    expect(registerRes.status).toBe(202);
    await activateByEmail('notif-flow@test.local');
    const loginRes = await request(app)
      .post('/api/auth/email/login')
      .send({ email: 'notif-flow@test.local', password: 'Password1' });
    expect(loginRes.status).toBe(200);
    const token: string = loginRes.body.token;

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.notifications).toEqual([]);
    expect(res.body.unreadCount).toBe(0);
  });
});

describe('DB-backed email tokens (guardian_verification_codes)', () => {
  it('a reset token minted on one app instance redeems on a second instance — no in-memory state', async () => {
    const email = 'cross-instance@test.local';
    await makeAthlete({ email });

    const appA = createApp();
    const appB = createApp();

    const forgotRes = await request(appA)
      .post('/api/auth/email/forgot-password')
      .send({ email });
    expect(forgotRes.status).toBe(200);
    const [, token] = vi.mocked(sendPasswordResetEmail).mock.calls[0];

    const resetRes = await request(appB)
      .post('/api/auth/email/reset-password')
      .send({ token, password: 'CrossInstancePw1' });
    expect(resetRes.status).toBe(200);

    const loginRes = await request(appB)
      .post('/api/auth/email/login')
      .send({ email, password: 'CrossInstancePw1' });
    expect(loginRes.status).toBe(200);
  });

  it('reset tokens are stored hashed, never plaintext', async () => {
    const email = 'hashed-at-rest@test.local';
    await makeAthlete({ email });

    await request(app).post('/api/auth/email/forgot-password').send({ email });
    const [, token] = vi.mocked(sendPasswordResetEmail).mock.calls[0];

    const rows = await db.select().from(schema.guardianVerificationCodes)
      .where(eq(schema.guardianVerificationCodes.purpose, 'password_reset'));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.codeHash).not.toBe(token);
      expect(row.linkToken).not.toBe(token);
    }
  });

  it('send-verification + verify-email round trip flips emailVerified and is single-use', async () => {
    const email = 'verify-flow@test.local';
    const athlete = await makeAthlete({ email });
    await db.update(schema.players).set({ emailVerified: false }).where(eq(schema.players.id, athlete.id));

    const loginRes = await request(app)
      .post('/api/auth/email/login')
      .send({ email, password: 'Test-pw-123' });
    expect(loginRes.status).toBe(200);

    const sendRes = await request(app)
      .post('/api/auth/email/send-verification')
      .set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(sendRes.status).toBe(200);
    const [sentTo, token] = vi.mocked(sendVerificationEmail).mock.calls[0];
    expect(sentTo).toBe(email);

    const verifyRes = await request(app)
      .post('/api/auth/email/verify-email')
      .send({ token });
    expect(verifyRes.status).toBe(200);

    const [after] = await db.select().from(schema.players).where(eq(schema.players.id, athlete.id));
    expect(after.emailVerified).toBe(true);

    const replay = await request(app)
      .post('/api/auth/email/verify-email')
      .send({ token });
    expect(replay.status).toBe(400);
  });
});
