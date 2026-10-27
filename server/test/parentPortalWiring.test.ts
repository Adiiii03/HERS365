import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, makeParent, linkParentChild, tokenFor } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

describe('GET /api/parent/children (widened read)', () => {
  it('requires a parent token', async () => {
    const coach = await makeCoach();
    const res = await request(app)
      .get('/api/parent/children')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`);
    expect(res.status).toBe(403);
  });

  it('returns the widened, client-shaped fields for a linked child', async () => {
    const parent = await makeParent();
    const child = await makeAthlete({
      name: 'Linked Athlete',
      school: 'Westlake HS',
      position: 'QB',
      gradYear: 2027,
      g5Rating: 4,
      gpa: '3.8',
      heightIn: 69,
      weightLbs: 130,
      profileImage: 'https://cdn.example/photo.jpg',
      collegeOffers: [{ school: 'Oregon' }, { school: 'USC' }],
      verificationStatus: 'verified',
    });
    await linkParentChild(parent.id, child.id);
    await db.insert(schema.athleteRankings).values({ playerId: child.id, overallScore: 4.2 });

    const res = await request(app)
      .get('/api/parent/children')
      .set('Authorization', `Bearer ${tokenFor(parent, 'parent')}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    const c = res.body.data[0];
    expect(c.id).toBe(child.id);
    expect(c.stars).toBe(4);               // g5Rating
    expect(c.breakoutScore).toBe(4.2);     // athleteRankings.overallScore
    expect(c.offers).toBe(2);              // collegeOffers.length
    expect(c.profileImage).toBe('https://cdn.example/photo.jpg');
    expect(c.verifiedStatus).toBe('Verified');
    expect(c.gpa).toBe('3.8');
    expect(c.heightIn).toBe(69);
    expect(c.city).toBe('Los Angeles');    // fixture default
    expect(typeof c.profileCompleteness).toBe('number');
    expect(c.profileCompleteness).toBeGreaterThan(0);
    expect(c.profileCompleteness).toBeLessThanOrEqual(100);
  });

  it('is null-safe when the child has no ranking row', async () => {
    const parent = await makeParent();
    const child = await makeAthlete({ verificationStatus: 'unverified' });
    await linkParentChild(parent.id, child.id);

    const res = await request(app)
      .get('/api/parent/children')
      .set('Authorization', `Bearer ${tokenFor(parent, 'parent')}`);

    expect(res.status).toBe(200);
    const c = res.body.data[0];
    expect(c.breakoutScore).toBeNull();
    expect(c.verifiedStatus).toBe('Pending Review');
    expect(c.offers).toBe(0);
  });

  it('only returns the parent\'s own linked children', async () => {
    const parent = await makeParent();
    const mine = await makeAthlete({ name: 'Mine' });
    await linkParentChild(parent.id, mine.id);
    await makeAthlete({ name: 'Not Mine' }); // unrelated athlete

    const res = await request(app)
      .get('/api/parent/children')
      .set('Authorization', `Bearer ${tokenFor(parent, 'parent')}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(mine.id);
  });
});

describe('GET /api/parent/profile', () => {
  it('requires a parent token', async () => {
    const coach = await makeCoach();
    const res = await request(app)
      .get('/api/parent/profile')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`);
    expect(res.status).toBe(403);
  });

  it('returns the caller\'s own name/email/phone + memberSince', async () => {
    const parent = await makeParent({ name: 'Pat Parent', phone: '555-9000' });
    const res = await request(app)
      .get('/api/parent/profile')
      .set('Authorization', `Bearer ${tokenFor(parent, 'parent')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Pat Parent');
    expect(res.body.data.email).toBe(parent.email);
    expect(res.body.data.phone).toBe('555-9000');
    expect(res.body.data).toHaveProperty('memberSince');
  });
});

describe('PUT /api/parent/profile', () => {
  it('requires a parent token', async () => {
    const coach = await makeCoach();
    const res = await request(app)
      .put('/api/parent/profile')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ name: 'X' });
    expect(res.status).toBe(403);
  });

  it('updates name and phone', async () => {
    const parent = await makeParent({ name: 'Old Name' });
    const res = await request(app)
      .put('/api/parent/profile')
      .set('Authorization', `Bearer ${tokenFor(parent, 'parent')}`)
      .send({ name: 'New Name', phone: '555-1234' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('New Name');
    expect(res.body.data.phone).toBe('555-1234');

    const [row] = await db.select().from(schema.parents).where(eq(schema.parents.id, parent.id));
    expect(row.name).toBe('New Name');
    expect(row.phone).toBe('555-1234');
  });

  it('rejects an empty body', async () => {
    const parent = await makeParent();
    const res = await request(app)
      .put('/api/parent/profile')
      .set('Authorization', `Bearer ${tokenFor(parent, 'parent')}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('Athlete change requests (parent approve/deny)', () => {
  async function seedRequest(playerId: number, over: Partial<typeof schema.athleteChangeRequests.$inferInsert> = {}) {
    const [row] = await db.insert(schema.athleteChangeRequests).values({
      playerId,
      kind: 'school',
      field: 'school',
      currentValue: 'Old School',
      proposedValue: 'New School HS',
      status: 'pending',
      ...over,
    }).returning();
    return row;
  }

  it('lists only requests for the parent\'s children', async () => {
    const parent = await makeParent();
    const mine = await makeAthlete();
    await linkParentChild(parent.id, mine.id);
    const other = await makeAthlete();
    await seedRequest(mine.id);
    await seedRequest(other.id);

    const res = await request(app)
      .get('/api/parent/change-requests')
      .set('Authorization', `Bearer ${tokenFor(parent, 'parent')}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].playerId).toBe(mine.id);
  });

  it('applies an allowlisted field on approve and records the resolution', async () => {
    const parent = await makeParent();
    const child = await makeAthlete({ school: 'Old School' });
    await linkParentChild(parent.id, child.id);
    const reqRow = await seedRequest(child.id, { field: 'school', proposedValue: 'New School HS' });

    const res = await request(app)
      .post(`/api/parent/change-requests/${reqRow.id}/respond`)
      .set('Authorization', `Bearer ${tokenFor(parent, 'parent')}`)
      .send({ action: 'approve' });

    expect(res.status).toBe(200);
    const [player] = await db.select().from(schema.players).where(eq(schema.players.id, child.id));
    expect(player.school).toBe('New School HS');
    const [after] = await db.select().from(schema.athleteChangeRequests).where(eq(schema.athleteChangeRequests.id, reqRow.id));
    expect(after.status).toBe('approved');
    expect(after.resolvedBy).toBe(parent.id);
    expect(after.resolvedAt).not.toBeNull();
  });

  it('applies the profileImage allowlist member on approve', async () => {
    const parent = await makeParent();
    const child = await makeAthlete({ profileImage: null });
    await linkParentChild(parent.id, child.id);
    const reqRow = await seedRequest(child.id, {
      kind: 'photo', field: 'profileImage', proposedValue: 'https://cdn.example/new.jpg',
    });

    const res = await request(app)
      .post(`/api/parent/change-requests/${reqRow.id}/respond`)
      .set('Authorization', `Bearer ${tokenFor(parent, 'parent')}`)
      .send({ action: 'approve' });

    expect(res.status).toBe(200);
    const [player] = await db.select().from(schema.players).where(eq(schema.players.id, child.id));
    expect(player.profileImage).toBe('https://cdn.example/new.jpg');
  });

  it('does not write a non-allowlisted field on approve', async () => {
    const parent = await makeParent();
    const child = await makeAthlete({ position: 'QB' });
    await linkParentChild(parent.id, child.id);
    const reqRow = await seedRequest(child.id, { kind: 'stat', field: 'position', proposedValue: 'WR' });

    const res = await request(app)
      .post(`/api/parent/change-requests/${reqRow.id}/respond`)
      .set('Authorization', `Bearer ${tokenFor(parent, 'parent')}`)
      .send({ action: 'approve' });

    expect(res.status).toBe(200);
    const [player] = await db.select().from(schema.players).where(eq(schema.players.id, child.id));
    expect(player.position).toBe('QB'); // unchanged
    const [after] = await db.select().from(schema.athleteChangeRequests).where(eq(schema.athleteChangeRequests.id, reqRow.id));
    expect(after.status).toBe('approved');
  });

  it('deny records the decision without applying', async () => {
    const parent = await makeParent();
    const child = await makeAthlete({ school: 'Old School' });
    await linkParentChild(parent.id, child.id);
    const reqRow = await seedRequest(child.id, { field: 'school', proposedValue: 'New School HS' });

    const res = await request(app)
      .post(`/api/parent/change-requests/${reqRow.id}/respond`)
      .set('Authorization', `Bearer ${tokenFor(parent, 'parent')}`)
      .send({ action: 'deny' });

    expect(res.status).toBe(200);
    const [player] = await db.select().from(schema.players).where(eq(schema.players.id, child.id));
    expect(player.school).toBe('Old School'); // unchanged
    const [after] = await db.select().from(schema.athleteChangeRequests).where(eq(schema.athleteChangeRequests.id, reqRow.id));
    expect(after.status).toBe('denied');
  });

  it('403s when responding to another parent\'s child request', async () => {
    const parentA = await makeParent();
    const parentB = await makeParent();
    const child = await makeAthlete();
    await linkParentChild(parentA.id, child.id);
    const reqRow = await seedRequest(child.id);

    const res = await request(app)
      .post(`/api/parent/change-requests/${reqRow.id}/respond`)
      .set('Authorization', `Bearer ${tokenFor(parentB, 'parent')}`)
      .send({ action: 'approve' });

    expect(res.status).toBe(403);
  });
});
