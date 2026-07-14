import { describe, expect, it } from 'vitest';
import { publicAthleteDiscoveryEnabled } from '../lib/publicExposure';

describe('publicAthleteDiscoveryEnabled', () => {
  it('is open by default only in explicit dev/test', () => {
    expect(publicAthleteDiscoveryEnabled({ APP_ENV: 'test' })).toBe(true);
    expect(publicAthleteDiscoveryEnabled({ APP_ENV: 'development' })).toBe(true);
    expect(publicAthleteDiscoveryEnabled({ APP_ENV: 'production' })).toBe(false);
    expect(publicAthleteDiscoveryEnabled({ NODE_ENV: 'production' })).toBe(false);
    expect(publicAthleteDiscoveryEnabled({})).toBe(false);
  });

  it('honors an explicit production toggle', () => {
    expect(publicAthleteDiscoveryEnabled({
      APP_ENV: 'production',
      PUBLIC_ATHLETE_DISCOVERY_ENABLED: 'true',
    })).toBe(true);
    expect(publicAthleteDiscoveryEnabled({
      APP_ENV: 'test',
      PUBLIC_ATHLETE_DISCOVERY_ENABLED: 'false',
    })).toBe(false);
  });
});
