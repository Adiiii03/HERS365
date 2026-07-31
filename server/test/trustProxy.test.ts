import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from '../app';

function appWithEcho() {
  const app = createApp();
  const echo = express.Router();
  echo.get('/__echo-ip', (req, res) => res.json({ ip: req.ip }));
  // Router mounts run in registration order, but this path collides with
  // nothing, so appending after createApp is safe.
  app.use('/api', echo);
  return app;
}

afterEach(() => {
  delete process.env.GLOBAL_RATE_LIMIT_MAX;
  delete process.env.TRUST_PROXY_HOPS;
});

describe('trust proxy', () => {
  it('req.ip reflects the client hop from X-Forwarded-For with one trusted hop', async () => {
    const res = await request(appWithEcho())
      .get('/api/__echo-ip')
      .set('X-Forwarded-For', '203.0.113.7');
    expect(res.status).toBe(200);
    expect(res.body.ip).toBe('203.0.113.7');
  });

  it('does not trust a spoofed extra hop (rightmost entry wins)', async () => {
    const res = await request(appWithEcho())
      .get('/api/__echo-ip')
      .set('X-Forwarded-For', '6.6.6.6, 203.0.113.7');
    expect(res.status).toBe(200);
    expect(res.body.ip).toBe('203.0.113.7');
    expect(res.body.ip).not.toBe('6.6.6.6');
  });

  it('TRUST_PROXY_HOPS overrides the hop count', async () => {
    process.env.TRUST_PROXY_HOPS = '2';
    const res = await request(appWithEcho())
      .get('/api/__echo-ip')
      .set('X-Forwarded-For', '6.6.6.6, 203.0.113.7');
    expect(res.body.ip).toBe('6.6.6.6');
  });
});

describe('global /api rate limiter', () => {
  it('returns 429 past the ceiling when enabled', async () => {
    process.env.GLOBAL_RATE_LIMIT_MAX = '3';
    const app = appWithEcho();
    const agent = request(app);
    for (let i = 0; i < 3; i++) {
      const ok = await agent.get('/api/__echo-ip').set('X-Forwarded-For', '198.51.100.9');
      expect(ok.status).toBe(200);
    }
    const blocked = await agent.get('/api/__echo-ip').set('X-Forwarded-For', '198.51.100.9');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/Too many requests/);
  });

  it('is skipped under test when GLOBAL_RATE_LIMIT_MAX is unset', async () => {
    const app = appWithEcho();
    for (let i = 0; i < 10; i++) {
      const res = await request(app).get('/api/__echo-ip');
      expect(res.status).toBe(200);
    }
  });
});
