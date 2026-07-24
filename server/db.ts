// MUST be first: loads the repo-root .env before `new Pool(...)` reads
// DATABASE_URL and before any env captured at module top elsewhere.
import './load-env';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { logger } from './logger';

export function sanitizeDatabaseUrl(connectionString?: string): string {
  if (!connectionString) return 'default-local';

  try {
    const url = new URL(connectionString);
    const credentials = url.username || url.password ? '[redacted]@' : '';
    const host = url.host || 'unknown-host';
    return `${url.protocol}//${credentials}${host}${url.pathname}`;
  } catch {
    return '[invalid-or-redacted]';
  }
}

// PostgreSQL connection pool (tuned for 50K users)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/hers365',
  max: Number(process.env.DB_POOL_MAX) || 100,
  min: Number(process.env.DB_POOL_MIN) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

logger.info('Connecting to database', { url: sanitizeDatabaseUrl(process.env.DATABASE_URL) });

export const db = drizzle(pool, { schema });
export const dbAsync = drizzle(pool, { schema });

logger.info('Database connection established');

// Export pool for use in routes and health checks
export { pool };
export { pool as dbConnection };
