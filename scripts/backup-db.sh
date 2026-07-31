#!/usr/bin/env bash
# scripts/backup-db.sh
# Daily PostgreSQL backup for HERS365. Dumps the postgres container's DB to a
# timestamped, gzipped file and prunes dumps older than the retention window.
#
# Intended to run via host cron on the VPS, e.g. (3 AM daily):
#   0 3 * * * /opt/hers365/scripts/backup-db.sh >> /var/log/hers365-backup.log 2>&1
#
# NOTE: backups land on the same VPS as the DB. That protects against DB
# corruption / bad deletes, NOT against total VPS loss. Copying dumps off-box
# (S3/another host) is a recommended phase-2 follow-up.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/hers365/backups}"
PG_CONTAINER="${PG_CONTAINER:-hers365-postgres-prod}"
PG_DB="${POSTGRES_DB:-hers365}"
PG_USER="${POSTGRES_USER:-postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

timestamp="$(date +%Y-%m-%d_%H%M%S)"
outfile="${BACKUP_DIR}/hers365_${timestamp}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Is)] Starting backup -> ${outfile}"

docker exec "$PG_CONTAINER" \
  pg_dump --clean --if-exists -U "$PG_USER" "$PG_DB" \
  | gzip > "$outfile"

size="$(stat -c%s "$outfile" 2>/dev/null || stat -f%z "$outfile")"
if [ "$size" -lt 1000 ]; then
  echo "[$(date -Is)] ERROR: backup file suspiciously small (${size} bytes) — treating as failure" >&2
  exit 1
fi

echo "[$(date -Is)] Backup OK (${size} bytes)"

deleted="$(find "$BACKUP_DIR" -name 'hers365_*.sql.gz' -type f -mtime +"$RETENTION_DAYS" -print -delete | wc -l)"
echo "[$(date -Is)] Pruned ${deleted} backup(s) older than ${RETENTION_DAYS} days"

echo "[$(date -Is)] Done."