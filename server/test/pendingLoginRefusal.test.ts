import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { resetDb } from './helpers/db';
import { makeAthlete, tokenFor } from './helpers/fixtures';

const app = createApp();
const PASSWORD = 'Test-pw-123';

beforeEach(async () => {
  await resetDb();
});

describe('login refusal for non-active athletes', () => {
  it('pending athlete gets 403 GUARDIAN_PENDING with no token on /api/auth/login', async () => {
    const player = await makeAthlete({ status: 'pending_guardian' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: player.email, password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ code: 'GUARDIAN_PENDING' });
  });

  it('pending athlete gets 403 GUARDIAN_PENDING with no token on /api/auth/email/login', async () => {
    const player = await makeAthlete({ status: 'pending_guardian' });
    const res = await request(app)
      .post('/api/auth/email/login')
      .send({ email: player.email, password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ code: 'GUARDIAN_PENDING' });
  });

  it('deactivated athlete gets 403 ACCOUNT_DEACTIVATED on both routers', async () => {
    const player = await makeAthlete({ status: 'deactivated' });
    for (const path of ['/api/auth/login', '/api/auth/email/login']) {
      const res = await request(app)
        .post(path)
        .send({ email: player.email, password: PASSWORD });
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ code: 'ACCOUNT_DEACTIVATED' });
    }
  });

  it('wrong password on a pending account still reads as 401 Invalid credentials', async () => {
    const player = await makeAthlete({ status: 'pending_guardian' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: player.email, password: 'wrong-password-1' });
    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('code');
  });
});

describe('requireActivated route gate', () => {
  it('a valid JWT for a pending athlete cannot hit gated routes', async () => {
    const player = await makeAthlete({ status: 'pending_guardian' });
    const token = tokenFor(player, 'athlete');
    const res = await request(app)
      .get('/api/messages/conversations')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ code: 'GUARDIAN_PENDING' });
  });

  it('a valid JWT for a deactivated athlete gets ACCOUNT_DEACTIVATED', async () => {
    const player = await makeAthlete({ status: 'deactivated' });
    const token = tokenFor(player, 'athlete');
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ code: 'ACCOUNT_DEACTIVATED' });
  });

  it('an active athlete logs in and passes gated routes', async () => {
    const player = await makeAthlete();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: player.email, password: PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();

    const res = await request(app)
      .get('/api/messages/conversations')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
  });
});
