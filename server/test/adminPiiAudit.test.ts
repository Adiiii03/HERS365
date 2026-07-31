import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { desc } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { signToken } from '../auth';
import { resetDb } from './helpers/db';
import { makeAthlete, makeAdmin } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

// The audit write is fire-and-forget so it doesn't block the admin response;
// poll the log until the expected number of rows lands.
async function waitForAuditRows(expected: number, timeoutMs = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rows = await db.select().from(schema.adminAccessLog).orderBy(schema.adminAccessLog.id);
    if (rows.length >= expected) return rows;
    await new Promise((r) => setTimeout(r, 25));
  }
  return db.select().from(schema.adminAccessLog).orderBy(schema.adminAccessLog.id);
}

describe('admin PII access auditing (PRD-C P1 #17)', () => {
  it('writes exactly one hash-chained row for a single-record PII read', async () => {
    const admin = await makeAdmin();
    await makeAthlete();

    const res = await request(app)
      .get('/api/admin/data/recent-signups')
      .set('Authorization', `Bearer ${signToken({ userId: admin.id, role: 'admin' })}`);
    expect(res.status).toBe(200);

    const rows = await waitForAuditRows(1);
    expect(rows).toHaveLength(1);

    const [row] = rows;
    expect(row.action).toBe('pii_read');
    expect(row.count).toBe(1);
    expect(row.subjectType).toBe('player');
    expect(row.adminId).toBe(admin.id);
    expect(row.fields).toContain('email');
    expect(row.prevHash).toBeNull();
    expect(row.rowHash).toBeTruthy();
  });

  it('logs bulk_read when more than one PII record is returned', async () => {
    const admin = await makeAdmin();
    await makeAthlete();
    await makeAthlete();

    const res = await request(app)
      .get('/api/admin/data/recent-signups')
      .set('Authorization', `Bearer ${signToken({ userId: admin.id, role: 'admin' })}`);
    expect(res.status).toBe(200);

    const [row] = await waitForAuditRows(1);
    expect(row.action).toBe('bulk_read');
    expect(row.count).toBe(2);
  });

  it('chains a second read onto the first (prev_hash == first row_hash)', async () => {
    const admin = await makeAdmin();
    await makeAthlete();
    const token = `Bearer ${signToken({ userId: admin.id, role: 'admin' })}`;

    await request(app).get('/api/admin/data/recent-signups').set('Authorization', token).expect(200);
    await waitForAuditRows(1);
    await request(app).get('/api/admin/data/recent-signups').set('Authorization', token).expect(200);

    const rows = await waitForAuditRows(2);
    expect(rows).toHaveLength(2);

    const [first, second] = rows;
    expect(first.prevHash).toBeNull();
    expect(first.rowHash).toBeTruthy();
    expect(second.prevHash).toBe(first.rowHash);
    expect(second.rowHash).toBeTruthy();
    expect(second.rowHash).not.toBe(first.rowHash);
  });

  it('does not log an aggregate/count-only response (no PII fields)', async () => {
    const admin = await makeAdmin();
    await makeAthlete();

    await request(app)
      .get('/api/admin/data/stats')
      .set('Authorization', `Bearer ${signToken({ userId: admin.id, role: 'admin' })}`)
      .expect(200);

    // Give any stray async write a chance to land, then assert none did.
    await new Promise((r) => setTimeout(r, 100));
    const rows = await db.select().from(schema.adminAccessLog).orderBy(desc(schema.adminAccessLog.id));
    expect(rows).toHaveLength(0);
  });
});
