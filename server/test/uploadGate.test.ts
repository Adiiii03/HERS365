import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { resetDb } from './helpers/db';
import { createApp } from '../app';
import { makeAthlete, tokenFor } from './helpers/fixtures';

vi.mock('../cloud-storage', () => ({
  getSignedUploadUrl: vi.fn(async (key: string, contentType: string, expiresIn: number) =>
    `https://signed.test.local/${key}?ct=${encodeURIComponent(contentType)}&exp=${expiresIn}`,
  ),
  getSignedDownloadUrl: vi.fn(async (key: string) =>
    `https://signed.test.local/${key}?X-Amz-Expires=900&X-Amz-Signature=stub`,
  ),
}));

const app = createApp();
const UUID_RE = /^profile-photos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;

const imageBody = { filename: 'photo.jpg', contentType: 'image/jpeg', size: 1024 };

let prevFlag: string | undefined;

beforeEach(async () => {
  await resetDb();
  prevFlag = process.env.MEDIA_UPLOAD_ENABLED;
});

afterEach(() => {
  if (prevFlag === undefined) delete process.env.MEDIA_UPLOAD_ENABLED;
  else process.env.MEDIA_UPLOAD_ENABLED = prevFlag;
});

describe('media upload gate', () => {
  it('returns 403 MEDIA_UPLOAD_DISABLED when the flag is off, even for an activated athlete', async () => {
    process.env.MEDIA_UPLOAD_ENABLED = 'false';
    const a = await makeAthlete();
    const res = await request(app)
      .post('/api/upload/presign')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send(imageBody);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MEDIA_UPLOAD_DISABLED');
  });

  it('fails closed when the flag is unset', async () => {
    delete process.env.MEDIA_UPLOAD_ENABLED;
    const a = await makeAthlete();
    const res = await request(app)
      .post('/api/upload/video/presign')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ filename: 'clip.mp4', contentType: 'video/mp4', size: 1024 });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MEDIA_UPLOAD_DISABLED');
  });

  it('returns 403 GUARDIAN_PENDING for a pending athlete when the flag is on', async () => {
    process.env.MEDIA_UPLOAD_ENABLED = 'true';
    const a = await makeAthlete({ status: 'pending' });
    const res = await request(app)
      .post('/api/upload/presign')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send(imageBody);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('GUARDIAN_PENDING');
  });

  it('presigns for an activated athlete with a verified guardian when the flag is on', async () => {
    process.env.MEDIA_UPLOAD_ENABLED = 'true';
    const a = await makeAthlete();
    const res = await request(app)
      .post('/api/upload/presign')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send(imageBody);
    expect(res.status).toBe(200);
    expect(res.body.key).toMatch(UUID_RE);
    expect(res.body.uploadUrl).toContain('https://signed.test.local/');
    expect(res.body.publicUrl).toContain('X-Amz-Expires=');
  });

  it('never emits a Date.now-style timestamp key', async () => {
    process.env.MEDIA_UPLOAD_ENABLED = 'true';
    const a = await makeAthlete();
    const res = await request(app)
      .post('/api/upload/presign')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send(imageBody);
    expect(res.status).toBe(200);
    expect(res.body.key).not.toMatch(/\/\d{12,}-/);
  });
});
