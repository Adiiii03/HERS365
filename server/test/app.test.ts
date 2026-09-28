import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('createApp', () => {
  it('serves /health without listening on a port', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(['ok', 'degraded']).toContain(res.body.status);
    expect(['up', 'down']).toContain(res.body.db);
  });

  it('reports non-secret deployment and safety readiness metadata on /health', async () => {
    process.env.APP_ENV = 'production';
    process.env.RAILWAY_GIT_COMMIT_SHA = 'abc123';
    process.env.RESEND_API_KEY = 're_test';
    process.env.REDIS_URL = 'redis://redis.internal:6379';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.FRONTEND_URL = 'https://hers365.vercel.app';
    process.env.PUBLIC_ATHLETE_DISCOVERY_ENABLED = 'false';
    process.env.MEDIA_UPLOAD_ENABLED = 'false';
    process.env.REGISTRATION_ENABLED = 'false';

    const res = await request(createApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.release).toEqual({
      commit: 'abc123',
      environment: 'production',
    });
    expect(res.body.integrations).toEqual(expect.objectContaining({
      email: true,
      redis: true,
      anthropic: true,
    }));
    expect(res.body.safety).toEqual(expect.objectContaining({
      productionEnv: true,
      guardianEmail: true,
      sharedRateLimitsAndRevocation: true,
      moderation: true,
      frontendLinks: true,
      publicAthleteDiscovery: false,
      mediaUploads: false,
      registration: false,
    }));
    expect(JSON.stringify(res.body)).not.toContain('re_test');
    expect(JSON.stringify(res.body)).not.toContain('sk-ant-test');
    expect(JSON.stringify(res.body)).not.toContain('redis://');
  });
});
