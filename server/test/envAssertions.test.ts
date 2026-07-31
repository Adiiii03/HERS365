import { describe, it, expect } from 'vitest';
import { assertProductionEnv, isProductionEnv } from '../lib/envAssertions';

const GOOD_PROD: NodeJS.ProcessEnv = {
  APP_ENV: 'production',
  CORS_ORIGIN: 'https://hers365.com',
  FRONTEND_URL: 'https://hers365.com',
  REDIS_URL: 'redis://prod-redis:6379',
  RESEND_API_KEY: 're_prod',
  ANTHROPIC_API_KEY: 'sk-ant-prod',
  CODE_PEPPER: 'x'.repeat(40),
};

describe('isProductionEnv', () => {
  it('is true for APP_ENV=production', () => {
    expect(isProductionEnv({ APP_ENV: 'production' })).toBe(true);
  });

  it('is true for NODE_ENV=production when APP_ENV is unset', () => {
    expect(isProductionEnv({ NODE_ENV: 'production' })).toBe(true);
  });

  it('is false when APP_ENV is set to something else, even with NODE_ENV=production', () => {
    expect(isProductionEnv({ APP_ENV: 'staging', NODE_ENV: 'production' })).toBe(false);
  });

  it('is false for dev/test', () => {
    expect(isProductionEnv({ APP_ENV: 'development' })).toBe(false);
    expect(isProductionEnv({ NODE_ENV: 'test' })).toBe(false);
    expect(isProductionEnv({})).toBe(false);
  });
});

describe('assertProductionEnv', () => {
  it('passes a fully configured production env', () => {
    expect(() => assertProductionEnv(GOOD_PROD)).not.toThrow();
  });

  it('is a no-op outside production — dev/test stay permissive', () => {
    expect(() => assertProductionEnv({ APP_ENV: 'development' })).not.toThrow();
    expect(() => assertProductionEnv({ NODE_ENV: 'test' })).not.toThrow();
    expect(() => assertProductionEnv({})).not.toThrow();
  });

  it('requires APP_ENV to be explicitly "production" when NODE_ENV=production', () => {
    expect(() => assertProductionEnv({ ...GOOD_PROD, APP_ENV: undefined, NODE_ENV: 'production' }))
      .toThrow(/APP_ENV must be explicitly set/);
  });

  it('rejects a missing or localhost CORS_ORIGIN', () => {
    expect(() => assertProductionEnv({ ...GOOD_PROD, CORS_ORIGIN: undefined }))
      .toThrow(/CORS_ORIGIN must be set/);
    expect(() => assertProductionEnv({ ...GOOD_PROD, CORS_ORIGIN: 'http://localhost:5173' }))
      .toThrow(/must not be a localhost/);
    expect(() => assertProductionEnv({ ...GOOD_PROD, CORS_ORIGIN: 'http://127.0.0.1:5173' }))
      .toThrow(/must not be a localhost/);
  });

  it('rejects a missing REDIS_URL', () => {
    expect(() => assertProductionEnv({ ...GOOD_PROD, REDIS_URL: undefined }))
      .toThrow(/REDIS_URL must be set/);
  });

  it('allows closed-mode production without Resend but rejects opening registration without it', () => {
    expect(() => assertProductionEnv({ ...GOOD_PROD, RESEND_API_KEY: undefined, REGISTRATION_ENABLED: 'false' }))
      .not.toThrow();
    expect(() => assertProductionEnv({ ...GOOD_PROD, RESEND_API_KEY: undefined, REGISTRATION_ENABLED: 'true' }))
      .toThrow(/RESEND_API_KEY must be set when REGISTRATION_ENABLED=true/);
  });

  it('rejects missing moderation infrastructure', () => {
    expect(() => assertProductionEnv({ ...GOOD_PROD, ANTHROPIC_API_KEY: undefined }))
      .toThrow(/ANTHROPIC_API_KEY must be set/);
  });

  it('rejects a missing or localhost FRONTEND_URL', () => {
    expect(() => assertProductionEnv({ ...GOOD_PROD, FRONTEND_URL: undefined }))
      .toThrow(/FRONTEND_URL must be set/);
    expect(() => assertProductionEnv({ ...GOOD_PROD, FRONTEND_URL: 'http://localhost:5173' }))
      .toThrow(/FRONTEND_URL must not be a localhost/);
  });

  it('rejects a missing or short CODE_PEPPER', () => {
    expect(() => assertProductionEnv({ ...GOOD_PROD, CODE_PEPPER: undefined }))
      .toThrow(/CODE_PEPPER must be set and at least 32/);
    expect(() => assertProductionEnv({ ...GOOD_PROD, CODE_PEPPER: 'short' }))
      .toThrow(/CODE_PEPPER must be set and at least 32/);
  });

  it('requires the Twilio trio only when SMS_ENABLED=true', () => {
    expect(() => assertProductionEnv({ ...GOOD_PROD, SMS_ENABLED: 'false' })).not.toThrow();
    expect(() => assertProductionEnv({ ...GOOD_PROD, SMS_ENABLED: 'true' }))
      .toThrow(/TWILIO_ACCOUNT_SID must be set/);
    expect(() =>
      assertProductionEnv({
        ...GOOD_PROD,
        SMS_ENABLED: 'true',
        TWILIO_ACCOUNT_SID: 'AC123',
        TWILIO_AUTH_TOKEN: 'tok',
        TWILIO_FROM: '+15555550100',
      }),
    ).not.toThrow();
  });

  it('collects ALL problems into a single message', () => {
    let message = '';
    try {
      assertProductionEnv({ NODE_ENV: 'production', SMS_ENABLED: 'true', REGISTRATION_ENABLED: 'true' });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toMatch(/APP_ENV/);
    expect(message).toMatch(/CORS_ORIGIN/);
    expect(message).toMatch(/REDIS_URL/);
    expect(message).toMatch(/RESEND_API_KEY/);
    expect(message).toMatch(/FRONTEND_URL/);
    expect(message).toMatch(/ANTHROPIC_API_KEY/);
    expect(message).toMatch(/CODE_PEPPER/);
    expect(message).toMatch(/TWILIO_ACCOUNT_SID/);
    expect(message).toMatch(/TWILIO_AUTH_TOKEN/);
    expect(message).toMatch(/TWILIO_FROM/);
  });
});
