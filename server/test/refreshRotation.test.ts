import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app';
import { resetDb } from './helpers/db';
import { makeAthlete } from './helpers/fixtures';
import { db } from '../db';
import * as schema from '../schema';
import { hashRefreshToken } from '../lib/refreshTokens';

const app = createApp();
beforeEach(resetDb);

async function login() {
  const athlete = await makeAthlete();
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: athlete.email, password: 'Test-pw-123' });
  expect(res.status).toBe(200);
  return { athlete, body: res.body, cookies: res.headers['set-cookie'] };
}

describe('refresh token rotation', () => {
  it('login issues an access + refresh pair, stored only as a hash', async () => {
    const { body } = await login();
    expect(body.token).toBeTypeOf('string');
    expect(body.refreshToken).toBeTypeOf('string');

    const rows = await db.select().from(schema.refreshTokens);
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(body.refreshToken);
    expect(rows[0].tokenHash).toBe(hashRefreshToken(body.refreshToken));
    expect(rows[0].familyId).toBeTruthy();
    expect(rows[0].isRevoked).toBe(false);
  });

  it('refresh rotates: old token is consumed, new pair works', async () => {
    const { body } = await login();

    const r1 = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: body.refreshToken });
    expect(r1.status).toBe(200);
    expect(r1.body.token).toBeTypeOf('string');
    expect(r1.body.refreshToken).toBeTypeOf('string');
    expect(r1.body.refreshToken).not.toBe(body.refreshToken);

    const [oldRow] = await db.select().from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.tokenHash, hashRefreshToken(body.refreshToken)));
    expect(oldRow.isRevoked).toBe(true);
    expect(oldRow.revokedReason).toBe('rotated');

    // The new access token authenticates, and the new refresh token rotates.
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${r1.body.token}`);
    expect(me.status).toBe(200);

    const r2 = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: r1.body.refreshToken });
    expect(r2.status).toBe(200);
  });

  it('reusing a consumed token returns 401 TOKEN_REUSE and revokes the family', async () => {
    const { body } = await login();

    const r1 = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: body.refreshToken });
    expect(r1.status).toBe(200);

    // Replay the consumed token.
    const reuse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: body.refreshToken });
    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe('TOKEN_REUSE');

    // The whole family is dead: the otherwise-valid rotated token no longer works.
    const afterReuse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: r1.body.refreshToken });
    expect(afterReuse.status).toBe(401);

    const rows = await db.select().from(schema.refreshTokens);
    expect(rows.every((r) => r.isRevoked)).toBe(true);
  });

  it('rejects a garbage refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'not-a-real-token' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBeUndefined();
  });

  it('accepts the refresh token from the httpOnly cookie', async () => {
    const { cookies } = await login();
    const refreshCookie = (cookies as unknown as string[]).find((c) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeTruthy();

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie!.split(';')[0]);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf('string');
  });
});

describe('refresh cookie flags', () => {
  const prevAppEnv = process.env.APP_ENV;
  afterEach(() => {
    if (prevAppEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = prevAppEnv;
  });

  it('sets httpOnly, sameSite lax, path scoped, and Secure in production', async () => {
    const athlete = await makeAthlete();
    process.env.APP_ENV = 'production';
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: athlete.email, password: 'Test-pw-123' });
    expect(res.status).toBe(200);

    const cookie = (res.headers['set-cookie'] as unknown as string[])
      .find((c) => c.startsWith('refreshToken='))!;
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie.toLowerCase()).toContain('samesite=lax');
    expect(cookie).toContain('Path=/api/auth');
  });
});

describe('access token payload minimization', () => {
  it('login token carries only userId and role', async () => {
    const { body } = await login();
    const payload = JSON.parse(Buffer.from(body.token.split('.')[1], 'base64url').toString());
    expect(payload.userId).toBe(body.user.id);
    expect(payload.role).toBe('athlete');
    expect(payload.email).toBeUndefined();
    expect(payload.name).toBeUndefined();
  });

  it('GET /api/auth/me hydrates email and name server side', async () => {
    const { athlete, body } = await login();
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(athlete.email);
    expect(me.body.user.name).toBe(athlete.name);
    expect(me.body.user.role).toBe('athlete');
  });
});
