import { describe, expect, it } from 'vitest';
import { sanitizeDatabaseUrl } from '../db';

describe('sanitizeDatabaseUrl', () => {
  it('redacts credentials before logging a database URL', () => {
    const url = sanitizeDatabaseUrl('postgres://user:super-secret@db.example.com:5432/hers365');

    expect(url).toContain('[redacted]');
    expect(url).toContain('db.example.com');
    expect(url).not.toContain('user');
    expect(url).not.toContain('super-secret');
  });

  it('does not echo invalid connection strings', () => {
    expect(sanitizeDatabaseUrl('not a url')).toBe('[invalid-or-redacted]');
  });
});
