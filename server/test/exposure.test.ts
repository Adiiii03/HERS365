import { afterEach, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, tokenFor } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);
afterEach(() => {
  delete process.env.PUBLIC_ATHLETE_DISCOVERY_ENABLED;
});

const FORBIDDEN_PUBLIC = ['passwordHash', 'password_hash', '@test.local', 'zipCode'];

describe('minor data exposure — /api/athletes', () => {
  it('public athlete list never contains email, passwordHash, or zip', async () => {
    await makeAthlete({ zipCode: '90001' });
    const res = await request(app).get('/api/athletes');
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    for (const needle of FORBIDDEN_PUBLIC) {
      expect(body, `leaked: ${needle}`).not.toContain(needle);
    }
  });

  it('public athlete detail never contains email, passwordHash, or zip', async () => {
    const a = await makeAthlete({ zipCode: '90001' });
    const res = await request(app).get(`/api/athletes/${a.id}`);
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    for (const needle of FORBIDDEN_PUBLIC) {
      expect(body, `leaked: ${needle}`).not.toContain(needle);
    }
  });
});

describe('minor data exposure — /api/players (routes.ts)', () => {
  it('players list never contains passwordHash', async () => {
    await makeAthlete();
    const coach = await makeCoach();
    const res = await request(app)
      .get('/api/players')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`);
    // whatever the status contract is, the body must never carry a hash
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });
});

describe('minor data exposure — /api/players public endpoints', () => {
  it('unauthenticated players list never contains email, passwordHash, or zip', async () => {
    await makeAthlete({ zipCode: '90001' });
    const res = await request(app).get('/api/players');
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    for (const needle of FORBIDDEN_PUBLIC) {
      expect(body, `leaked: ${needle}`).not.toContain(needle);
    }
  });

  it('unauthenticated player detail never contains email, passwordHash, or zip', async () => {
    const a = await makeAthlete({ zipCode: '90001' });
    const res = await request(app).get(`/api/players/${a.id}`);
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    for (const needle of FORBIDDEN_PUBLIC) {
      expect(body, `leaked: ${needle}`).not.toContain(needle);
    }
  });

  it("own /api/profile still includes the athlete's own email", async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(a.email);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });
});

describe('minor data exposure — public discovery closed', () => {
  it('blocks anonymous athlete directory/profile/feed when public discovery is disabled', async () => {
    process.env.PUBLIC_ATHLETE_DISCOVERY_ENABLED = 'false';
    const a = await makeAthlete();
    await db.insert(schema.posts).values({ playerId: a.id, content: 'launch post' });

    const list = await request(app).get('/api/athletes');
    const detail = await request(app).get(`/api/athletes/${a.id}`);
    const players = await request(app).get('/api/players');
    const posts = await request(app).get('/api/posts');

    expect(list.status).toBe(401);
    expect(detail.status).toBe(401);
    expect(players.status).toBe(401);
    expect(posts.status).toBe(401);
  });

  it('still allows authenticated in-app feed access when public discovery is disabled', async () => {
    process.env.PUBLIC_ATHLETE_DISCOVERY_ENABLED = 'false';
    const a = await makeAthlete();
    await db.insert(schema.posts).values({ playerId: a.id, content: 'launch post' });

    const posts = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`);

    expect(posts.status).toBe(200);
    expect(posts.body).toHaveLength(1);
  });
});
