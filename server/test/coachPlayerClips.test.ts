import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, makeParent, linkParentChild, tokenFor } from './helpers/fixtures';

// GET /api/coach/player-clips used to return a hardcoded sample of athletes who
// were not in the database. It now serves the real roster mapped to the
// scouting shape, gated by the same coachDiscoverable flag as coach search.

const app = createApp();
beforeEach(resetDb);

const coachAuth = (c: { id: number; email: string; name: string | null }) =>
  ({ Authorization: `Bearer ${tokenFor(c, 'coach')}` });
const parentAuth = (p: { id: number; email: string; name: string | null }) =>
  ({ Authorization: `Bearer ${tokenFor(p, 'parent')}` });

describe('GET /api/coach/player-clips serves the real roster', () => {
  it('returns real athletes, hides coachDiscoverable=false ones, and drops the old hardcoded sample', async () => {
    const visible = await makeAthlete({ name: 'Clip Carla', position: 'WR', g5Rating: 4 });

    const parent = await makeParent();
    const hidden = await makeAthlete({ name: 'Clip Hidden', position: 'QB' });
    await linkParentChild(parent.id, hidden.id);
    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ profileVisibility: false });

    const coach = await makeCoach();
    const res = await request(app).get('/api/coach/player-clips').set(coachAuth(coach));
    expect(res.status).toBe(200);

    const clips = res.body.clips as Array<{ playerId: number; name: string; position: string; school: string; stars: number | null; breakoutScore: number | null }>;
    expect(Array.isArray(clips)).toBe(true);

    const ids = clips.map((c) => c.playerId);
    expect(ids).toContain(visible.id);
    expect(ids).not.toContain(hidden.id);

    const names = clips.map((c) => c.name);
    expect(names).not.toContain('Aaliyah Thompson');
    expect(names).not.toContain('Jordan Davis');

    const carla = clips.find((c) => c.playerId === visible.id)!;
    expect(carla.name).toBe('Clip Carla');
    expect(carla.position).toBe('WR');
    // makeCoach() is a REAL coach (not the demo allowlist), so stats are real-or-null:
    // stars is the athlete's real g5Rating, and breakoutScore is null (no real source,
    // never fabricated for a real coach).
    expect(carla.stars).toBe(4);
    expect(carla.breakoutScore).toBeNull();
  });

  it('requires a coach (athlete token is rejected)', async () => {
    const athlete = await makeAthlete({ name: 'Not A Coach' });
    const res = await request(app)
      .get('/api/coach/player-clips')
      .set({ Authorization: `Bearer ${tokenFor(athlete, 'athlete')}` });
    expect(res.status).toBe(403);
  });
});
