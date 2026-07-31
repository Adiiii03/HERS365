import type { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { adminUsers } from '../schema';
import { eq } from 'drizzle-orm';
import { appendAdminAudit } from '../lib/auditChain';

// PRD-C P1 #17: every admin read of minor PII is recorded in the hash-chained
// admin_access_log. Mounted at the router level and implemented by intercepting
// the outgoing response, so a new admin handler is covered automatically — an
// insider cannot bypass the log by forgetting a manual call. The threat model
// names an admin adversary, so the record must be tamper evident (row_hash
// chains over prev_hash via appendAdminAudit) and impossible to skip.

// Fields whose presence on a returned row marks it as minor PII. These are the
// contact/identity fields the privacy strippers guard; an aggregate/count
// response never carries them, so stats endpoints don't log.
const PII_FIELDS = ['email', 'phone', 'dob', 'zipCode', 'pendingParentEmail'] as const;

// Bulk reads above this many records are the shape of a scrape/exfil, so they
// get an extra loud line even though the row itself is already logged.
const BULK_ALERT_THRESHOLD = 50;

function isPiiRecord(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return PII_FIELDS.some((f) => row[f] != null && row[f] !== '');
}

// Pull the record-bearing part out of the common response envelopes this API
// uses: a bare array, a bare row, { data }, { users }, { reports }. Anything
// else contributes nothing (and therefore never logs).
function collectRecords(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(isPiiRecord) as Record<string, unknown>[];
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    for (const key of ['data', 'users', 'reports']) {
      if (key in obj) return collectRecords(obj[key]);
    }
    if (isPiiRecord(obj)) return [obj];
  }
  return [];
}

// Union of PII field names actually present across the returned records, so the
// log says which sensitive columns the admin saw, not just that PII was read.
function fieldsSeen(records: Record<string, unknown>[]): string {
  const seen = new Set<string>();
  for (const r of records) {
    for (const f of PII_FIELDS) if (r[f] != null && r[f] !== '') seen.add(f);
  }
  return [...seen].sort().join(',');
}

// admin_id has a FK to admin_users. A forged/self-signed admin token (used in
// tests and possible in prod misconfig) may carry an id with no matching row;
// insert null rather than violating the constraint and losing the whole record.
async function resolveAdminId(id: unknown): Promise<number | null> {
  if (typeof id !== 'number' || !Number.isInteger(id)) return null;
  const [row] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  return row?.id ?? null;
}

export function auditPiiAccess() {
  return function (req: Request, res: Response, next: NextFunction): void {
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown): Response {
      // Only successful reads carry PII worth logging; error bodies don't.
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const records = collectRecords(body);
        if (records.length > 0) {
          const count = records.length;
          const action = count > 1 ? 'bulk_read' : 'pii_read';
          const user = (req as any).user as { id?: number } | undefined;

          if (count > BULK_ALERT_THRESHOLD) {
            console.warn(
              `[ALERT] admin ${user?.id ?? 'unknown'} bulk-read ${count} minor PII records via ${req.method} ${req.originalUrl}`,
            );
          }

          // Fire and forget: the audit write must never block or fail the admin
          // response, but a write failure is loud so it can't hide an access.
          void (async () => {
            try {
              const adminId = await resolveAdminId(user?.id);
              await appendAdminAudit(db, [
                {
                  adminId,
                  action,
                  subjectType: 'player',
                  subjectId: count === 1 ? (records[0].id as number) ?? null : null,
                  fields: fieldsSeen(records),
                  count,
                  ipAddress: req.ip ?? null,
                  userAgent: req.get('user-agent') ?? null,
                },
              ]);
            } catch (err) {
              console.error('[ALERT] admin PII access audit write failed', err);
            }
          })();
        }
      }
      return originalJson(body);
    };

    next();
  };
}

export default auditPiiAccess;
