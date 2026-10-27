import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, tokenFor } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

// Record a 'player_viewed' coach event directly. The real endpoint fires these
// via recordCoachEvent without awaiting, so driving analytics through
// GET /players/:id would be racy — insert deterministically instead.
async function viewEvent(coachId: number, playerId: number, createdAt?: Date) {
  await db.insert(schema.coachEvents).values({
    coachId,
    eventType: 'player_viewed',
    metadata: { playerId },
    ...(createdAt ? { createdAt } : {}),
  });
}

async function sendMessage(
  coachId: number,
  athleteId: number,
  senderType: 'coach' | 'athlete',
) {
  await db.insert(schema.messages).values({
    coachId,
    athleteId,
    senderId: senderType === 'coach' ? coachId : athleteId,
    senderType,
    content: 'hello',
  });
}

async function saveProspect(coachId: number, athleteId: number, tier: string) {
  await db.insert(schema.coachProspects).values({ coachId, athleteId, tier });
}

const analytics = (token: string) =>
  request(app).get('/api/coach/analytics').set('Authorization', `Bearer ${token}`);

describe('GET /api/coach/analytics — access control', () => {
  it('rejects unauthenticated callers with 401', async () => {
    const res = await request(app).get('/api/coach/analytics');
    expect(res.status).toBe(401);
  });

  it('rejects athlete-role callers with 403', async () => {
    const athlete = await makeAthlete();
    const res = await analytics(tokenFor(athlete, 'athlete'));
    expect(res.status).toBe(403);
  });

  it('rejects unverified coaches with 403', async () => {
    const coach = await makeCoach({ verifiedStatus: false });
    const res = await analytics(tokenFor(coach, 'coach'));
    expect(res.status).toBe(403);
  });
});

describe('GET /api/coach/analytics — messagesSent (B7)', () => {
  it('counts only coach-authored messages, not athlete replies in the thread', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await sendMessage(coach.id, athlete.id, 'coach');
    await sendMessage(coach.id, athlete.id, 'athlete');

    const res = await analytics(tokenFor(coach, 'coach'));
    expect(res.status).toBe(200);
    expect(res.body.messagesSent).toBe(1);
  });
});

describe('GET /api/coach/analytics — profileViews + recentlyViewed (B2)', () => {
  it('counts all-time views and returns distinct athletes as {id,name}, newest first', async () => {
    const coach = await makeCoach();
    const a1 = await makeAthlete({ name: 'Aaliyah Brooks' });
    const a2 = await makeAthlete({ name: 'Maya Thompson' });
    const now = Date.now();
    // a2 oldest, then a1 twice (a1 is the most recently viewed).
    await viewEvent(coach.id, a2.id, new Date(now - 3000));
    await viewEvent(coach.id, a1.id, new Date(now - 2000));
    await viewEvent(coach.id, a1.id, new Date(now - 1000));

    const res = await analytics(tokenFor(coach, 'coach'));
    expect(res.status).toBe(200);
    // all-time event count, not distinct
    expect(res.body.profileViews).toBe(3);
    // distinct athletes, most-recent first
    expect(res.body.recentlyViewed).toEqual([
      { id: a1.id, name: 'Aaliyah Brooks' },
      { id: a2.id, name: 'Maya Thompson' },
    ]);
  });

  it('returns empty recentlyViewed and zero profileViews when nothing was viewed', async () => {
    const coach = await makeCoach();
    const res = await analytics(tokenFor(coach, 'coach'));
    expect(res.status).toBe(200);
    expect(res.body.profileViews).toBe(0);
    expect(res.body.recentlyViewed).toEqual([]);
  });
});

describe('GET /api/coach/analytics — pipeline, states, positions, weekly', () => {
  it('reports the offered tier count and leaves committed at 0', async () => {
    const coach = await makeCoach();
    const a1 = await makeAthlete();
    const a2 = await makeAthlete();
    await saveProspect(coach.id, a1.id, 'offered');
    await saveProspect(coach.id, a2.id, 'watching');

    const res = await analytics(tokenFor(coach, 'coach'));
    expect(res.status).toBe(200);
    expect(res.body.recruitingPipeline.prospects).toBe(2);
    expect(res.body.recruitingPipeline.offered).toBe(1);
    expect(res.body.recruitingPipeline.committed).toBe(0);
  });

  it('shapes topStates and positionBreakdown off the board', async () => {
    const coach = await makeCoach();
    const qb = await makeAthlete({ state: 'CA', position: 'QB' });
    const wr = await makeAthlete({ state: 'CA', position: 'WR' });
    await saveProspect(coach.id, qb.id, 'watching');
    await saveProspect(coach.id, wr.id, 'watching');

    const res = await analytics(tokenFor(coach, 'coach'));
    expect(res.status).toBe(200);
    // both athletes in CA → one state row at 100%
    expect(res.body.topStates).toEqual([{ state: 'CA', players: 2, percentage: 100 }]);
    // one QB + one WR → two position rows at 50% each
    expect(res.body.positionBreakdown).toHaveLength(2);
    for (const row of res.body.positionBreakdown) {
      expect(row).toMatchObject({ count: 1, percentage: 50 });
      expect(['QB', 'WR']).toContain(row.position);
    }
  });

  it('zero-fills weeklyActivity to all 7 weekdays with saves always 0', async () => {
    const coach = await makeCoach();
    const res = await analytics(tokenFor(coach, 'coach'));
    expect(res.status).toBe(200);
    expect(res.body.weeklyActivity).toHaveLength(7);
    expect(res.body.weeklyActivity.map((d: { day: string }) => d.day)).toEqual([
      'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
    ]);
    for (const d of res.body.weeklyActivity) {
      expect(d.saves).toBe(0);
    }
  });
});

describe('GET /api/coach/analytics — per-coach isolation (safety)', () => {
  it('never counts another coach\'s prospects, messages, or views', async () => {
    const coachA = await makeCoach();
    const coachB = await makeCoach();
    const mine = await makeAthlete({ name: 'My Athlete' });
    const theirs = await makeAthlete({ name: 'Their Athlete' });

    // coach B's data — must not leak into coach A's analytics.
    await saveProspect(coachB.id, theirs.id, 'offered');
    await sendMessage(coachB.id, theirs.id, 'coach');
    await viewEvent(coachB.id, theirs.id);

    // coach A's own data.
    await saveProspect(coachA.id, mine.id, 'watching');
    await sendMessage(coachA.id, mine.id, 'coach');
    await viewEvent(coachA.id, mine.id);

    const res = await analytics(tokenFor(coachA, 'coach'));
    expect(res.status).toBe(200);
    expect(res.body.boardCount).toBe(1);
    expect(res.body.messagesSent).toBe(1);
    expect(res.body.profileViews).toBe(1);
    expect(res.body.recruitingPipeline.offered).toBe(0);
    expect(res.body.recentlyViewed).toEqual([{ id: mine.id, name: 'My Athlete' }]);
  });
});

describe('GET /api/coach/players/:id — highlights (B6)', () => {
  it('maps real player_highlights rows to {title, locked:false}', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await db.insert(schema.playerHighlights).values({
      playerId: athlete.id,
      videoUrl: 'https://cdn.example/clip.mp4',
      thumbnailUrl: 'https://cdn.example/clip.jpg',
      category: 'Touchdowns',
      season: '2024',
    });

    const res = await request(app)
      .get(`/api/coach/players/${athlete.id}`)
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`);
    expect(res.status).toBe(200);
    expect(res.body.highlights).toHaveLength(1);
    expect(res.body.highlights[0]).toMatchObject({
      title: 'Touchdowns · 2024',
      url: 'https://cdn.example/clip.mp4',
      thumbnailUrl: 'https://cdn.example/clip.jpg',
      locked: false,
    });
  });

  it('returns an empty highlights array when the athlete has no clips', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();

    const res = await request(app)
      .get(`/api/coach/players/${athlete.id}`)
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`);
    expect(res.status).toBe(200);
    expect(res.body.highlights).toEqual([]);
  });
});
