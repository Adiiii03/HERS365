# Database Backups

Automated daily PostgreSQL backups for HERS365, run via host cron on the VPS.

## What it does

backup-db.sh runs pg_dump against the hers365-postgres-prod container, writes a timestamped gzipped dump, and prunes dumps older than the retention window (default 7 days).

## Install (on the VPS)

1. Make the script executable:  chmod +x /opt/hers365/scripts/backup-db.sh
2. Add a cron entry (daily at 3 AM) via 'crontab -e':

   0 3 * * * /opt/hers365/scripts/backup-db.sh >> /var/log/hers365-backup.log 2>&1

## Configuration (env vars, all optional)

- BACKUP_DIR (default /opt/hers365/backups) - confirm path with Adi/Richard
- PG_CONTAINER (default hers365-postgres-prod)
- POSTGRES_DB (default hers365)
- POSTGRES_USER (default postgres)
- RETENTION_DAYS (default 7)

## Restore from a backup

  gunzip -c /opt/hers365/backups/hers365_DATE.sql.gz | docker exec -i hers365-postgres-prod psql -U postgres -d hers365

The dump uses --clean --if-exists, so it drops and recreates objects on restore (safe over an existing DB).

## Known limitations / follow-ups

- Backups live on the same VPS as the DB. Protects against DB corruption or bad deletes, NOT total VPS loss. Copying dumps off-box (S3 or another host) is a recommended phase-2 improvement.
- Restores should be periodically tested, not just assumed to work.