import crypto from 'crypto';
import { desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { consentAuditLog, adminAccessLog } from '../schema';

type AuditTable = 'consent_audit_log' | 'admin_access_log';
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbHandle = typeof db | Tx;

// A hash chain requires the tip-read and the insert to be atomic against every
// other appender, or two concurrent writers read the same tip and one row lands
// with a stale prev_hash (a broken chain). A transaction-scoped advisory lock
// (one constant key per table) serializes appenders; it releases at commit.
const LOCK_KEY: Record<AuditTable, number> = {
  consent_audit_log: 848301001,
  admin_access_log: 848301002,
};

// Fields set by the DB or the chain itself are never part of the hashed payload.
const EXCLUDED = new Set(['id', 'prevHash', 'rowHash', 'createdAt']);

function canonicalize(payload: Record<string, unknown>): string {
  const keys = Object.keys(payload)
    .filter((k) => !EXCLUDED.has(k) && payload[k] !== undefined)
    .sort();
  const ordered: Record<string, unknown> = {};
  for (const k of keys) ordered[k] = payload[k];
  return JSON.stringify(ordered);
}

export function computeRowHash(prevHash: string | null, payload: object): string {
  const canonical = canonicalize(payload as Record<string, unknown>);
  return crypto
    .createHash('sha256')
    .update((prevHash ?? '') + canonical)
    .digest('hex');
}

export async function getLatestRowHash(tx: DbHandle, table: AuditTable): Promise<string | null> {
  const t = table === 'consent_audit_log' ? consentAuditLog : adminAccessLog;
  const [row] = await tx.select({ rowHash: t.rowHash }).from(t).orderBy(desc(t.id)).limit(1);
  return row?.rowHash ?? null;
}

async function appendChained(tx: Tx, table: AuditTable, rows: object[]): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(${LOCK_KEY[table]})`);
  const t = table === 'consent_audit_log' ? consentAuditLog : adminAccessLog;
  let prev = await getLatestRowHash(tx, table);
  for (const row of rows) {
    const rowHash = computeRowHash(prev, row);
    const values = { ...row, prevHash: prev, rowHash } as typeof t.$inferInsert;
    await tx.insert(t as typeof consentAuditLog).values(values as typeof consentAuditLog.$inferInsert);
    prev = rowHash;
  }
}

// When given an existing transaction (the consent path, inside guardian verify),
// chain within it so the audit commits atomically with the activation. When
// given the base db (the fire-and-forget admin path), open our own transaction
// so the advisory lock has a scope and the chain stays consistent.
function isTx(handle: DbHandle): handle is Tx {
  return typeof (handle as { transaction?: unknown }).transaction !== 'function';
}

export async function appendConsentAudit(handle: DbHandle, rows: object[]): Promise<void> {
  if (isTx(handle)) return appendChained(handle, 'consent_audit_log', rows);
  await handle.transaction((tx) => appendChained(tx, 'consent_audit_log', rows));
}

export async function appendAdminAudit(handle: DbHandle, rows: object[]): Promise<void> {
  if (isTx(handle)) return appendChained(handle, 'admin_access_log', rows);
  await handle.transaction((tx) => appendChained(tx, 'admin_access_log', rows));
}
