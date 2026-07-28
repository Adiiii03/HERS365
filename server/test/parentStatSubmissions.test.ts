import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { parentStatSubmissionBody } from '../middleware/safetySchemas';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, makeParent, makeAdmin, linkParentChild, tokenFor } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

describe('parentStatSubmissionBody', () => {
  it('accepts the launch-aligned field names', () => {
    const parsed = parentStatSubmissionBody.parse({
      athleteName: 'Test Athlete',
      athleteEmail: 'athlete@test.local',
      athleteDob: '2009-01-01',
      gradYear: 2027,
      position: 'QB',
      state: 'CA',
      division: 'Varsity',
      passingTds: 12,
      rushingTds: 4,
      receivingTds: 2,
      defensiveTds: 1,
      sacks: 7,
      hersRating: 4.6,
      fortyYardDash: 4.81,
      verticalJump: 28,
      shuttle5105: 4.32,
    });

    expect(parsed.fortyYardDash).toBe(4.81);
    expect(parsed.verticalJump).toBe(28);
    expect(parsed.shuttle5105).toBe(4.32);
  });

  it('rejects Patrick-era legacy combine field names', () => {
    const result = parentStatSubmissionBody.safeParse({
      athleteName: 'Test Athlete',
      fortyDash: '4.81',
      vertical: '28',
      shuttle: '4.32',
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('legacy field names unexpectedly passed validation');
    const issues = JSON.stringify(result.error.issues);
    expect(issues).toMatch(/fortyYardDash/);
    expect(issues).toMatch(/verticalJump/);
    expect(issues).toMatch(/shuttle5105/);
  });
});

describe('POST /api/parent/stat-submissions', () => {
  it('requires a parent token', async () => {
    const coach = await makeCoach();
    const res = await request(app)
      .post('/api/parent/stat-submissions')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ athleteName: 'Test Athlete' });

    expect(res.status).toBe(403);
  });

  it('rejects submissions for an unrelated playerId', async () => {
    const parent = await makeParent();
    const otherChild = await makeAthlete();

    const res = await request(app)
      .post('/api/parent/stat-submissions')
      .set('Authorization', `Bearer ${tokenFor(parent, 'parent')}`)
      .send({ playerId: otherChild.id, athleteName: 'Other Child' });

    expect(res.status).toBe(403);
  });

  it('stores the aligned stat submission for a linked child', async () => {
    const parent = await makeParent();
    const child = await makeAthlete({
      email: 'linked-athlete@test.local',
      name: 'Linked Athlete',
      dob: new Date('2009-01-01'),
      gradYear: 2027,
      position: 'QB',
      state: 'CA',
    });
    await linkParentChild(parent.id, child.id);

    const res = await request(app)
      .post('/api/parent/stat-submissions')
      .set('Authorization', `Bearer ${tokenFor(parent, 'parent')}`)
      .send({
        playerId: child.id,
        athleteEmail: child.email,
        athleteName: child.name,
        athleteDob: '2009-01-01',
        gradYear: 2027,
        position: 'QB',
        state: 'CA',
        division: 'Varsity',
        season: '2026',
        passingTds: 12,
        rushingTds: 4,
        receivingTds: 2,
        defensiveTds: 1,
        sacks: 7,
        hersRating: 4.6,
        fortyYardDash: 4.81,
        verticalJump: 28,
        shuttle5105: 4.32,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.verificationStatus).toBe('pending');
    expect(res.body.data.playerId).toBe(child.id);
    expect(res.body.data.fortyYardDash).toBe(4.81);
    expect(res.body.data.verticalJump).toBe(28);
    expect(res.body.data.shuttle5105).toBe(4.32);

    const [row] = await db
      .select()
      .from(schema.parentStatSubmissions)
      .where(eq(schema.parentStatSubmissions.id, res.body.data.id));
    expect(row.athleteEmail).toBe('linked-athlete@test.local');
    expect(row.passingTds).toBe(12);
    expect(row.rushingTds).toBe(4);
    expect(row.receivingTds).toBe(2);
    expect(row.defensiveTds).toBe(1);
    expect(row.sacks).toBe(7);
    expect(row.hersRating).toBe(4.6);
  });
});

describe('Admin verification and auto-sync flow', () => {
  it('verifies submission, syncs stats into gameStats and combineStats, and marks player verified', async () => {
    const parent = await makeParent();
    const child = await makeAthlete({
      email: 'sync-athlete@test.local',
      name: 'Sync Athlete',
      verificationStatus: 'unverified',
    });
    await linkParentChild(parent.id, child.id);
    const admin = await makeAdmin();

    const submitRes = await request(app)
      .post('/api/parent/stats/submit')
      .set('Authorization', `Bearer ${tokenFor(parent, 'parent')}`)
      .send({
        playerId: child.id,
        season: '2026',
        passingTds: 15,
        passingYards: 1850,
        fortyYardDash: 4.75,
        verticalJump: 30,
        maxPrepsUrl: 'https://maxpreps.com/athlete/123',
      });
    expect(submitRes.status).toBe(201);
    const subId = submitRes.body.data.id;

    const listRes = await request(app)
      .get('/api/admin/parent-stat-submissions')
      .set('Authorization', `Bearer ${tokenFor(admin, 'admin')}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((s: any) => s.id === subId)).toBe(true);

    const patchRes = await request(app)
      .patch(`/api/admin/parent-stat-submissions/${subId}`)
      .set('Authorization', `Bearer ${tokenFor(admin, 'admin')}`)
      .send({ status: 'verified', adminNotes: 'Verified maxpreps link' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.status).toBe('verified');
    expect(patchRes.body.data.verificationStatus).toBe('verified');

    const [updatedPlayer] = await db.select().from(schema.players).where(eq(schema.players.id, child.id));
    expect(updatedPlayer.verificationStatus).toBe('verified');

    const [gameStatsRow] = await db.select().from(schema.gameStats).where(eq(schema.gameStats.playerId, child.id));
    expect(gameStatsRow.passingTds).toBe(15);
    expect(gameStatsRow.passingYards).toBe(1850);

    const [combineStatsRow] = await db.select().from(schema.combineStats).where(eq(schema.combineStats.playerId, child.id));
    expect(combineStatsRow.fortyDash).toBe('4.75');
    expect(combineStatsRow.vertical).toBe('30');
  });
});

