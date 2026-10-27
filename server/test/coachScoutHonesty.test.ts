import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, tokenFor } from './helpers/fixtures';

// The core safety guarantee: a REAL coach never sees a fabricated measurement about a
// real minor. The server only invents combine/height/weight/breakout for the demo coach
// credential (coach@hers365.com, dev/test env); every other coach gets the real value or
// null. vitest runs with NODE_ENV=test, which is in the server's ALLOWED_DEMO_ENVS, so the
// demo path is reachable in-suite by using the demo email.

const app = createApp();
beforeEach(resetDb);

const search = (token: string) =>
  request(app).get('/api/coach/players/search').set('Authorization', `Bearer ${token}`);

const findById = (body: any, id: number) =>
  (body.players as any[]).find((p) => p.id === id);

describe('coach player search — no fabricated stats for real coaches', () => {
  it('returns null (not invented) stats when the athlete has no measured data', async () => {
    // No heightIn/weightLbs/gpa/g5Rating and no combine row.
    const athlete = await makeAthlete({ name: 'No Data Nadia', position: 'WR' });
    const coach = await makeCoach(); // random email → real-coach path

    const res = await search(tokenFor(coach, 'coach'));
    expect(res.status).toBe(200);
    const card = findById(res.body, athlete.id);
    expect(card).toBeDefined();
    expect(card.height).toBeNull();
    expect(card.weight).toBeNull();
    expect(card.gpa).toBeNull();
    expect(card.breakoutScore).toBeNull();
    expect(card.stars).toBeNull();      // no g5Rating → not fabricated to 3
    expect(card.combineStats).toBeNull();
    expect(card.stats).toBeNull();
  });

  it('passes through the REAL measured values when they exist', async () => {
    const athlete = await makeAthlete({
      name: 'Real Rhea', position: 'QB',
      heightIn: 66, weightLbs: 130, gpa: '3.8', g5Rating: 5,
    });
    const coach = await makeCoach();

    const res = await search(tokenFor(coach, 'coach'));
    expect(res.status).toBe(200);
    const card = findById(res.body, athlete.id);
    expect(card.height).toBe("5'6\"");
    expect(card.weight).toBe(130);
    expect(card.gpa).toBe(3.8);
    expect(card.stars).toBe(5);
  });

  it('still fabricates a full card for the DEMO coach credential', async () => {
    const athlete = await makeAthlete({ name: 'No Data Nadia', position: 'WR' });
    const demoCoach = await makeCoach({ email: 'coach@hers365.com' });

    const res = await search(tokenFor(demoCoach, 'coach'));
    expect(res.status).toBe(200);
    const card = findById(res.body, athlete.id);
    expect(card).toBeDefined();
    // Demo path fills the card even with no real data.
    expect(typeof card.height).toBe('string');
    expect(card.height).not.toBeNull();
    expect(typeof card.weight).toBe('number');
    expect(typeof card.breakoutScore).toBe('number');
  });
});
