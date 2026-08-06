-- 0011 created parent_stat_submissions without the columns schema.ts declares,
-- so every insert from the parent portal failed at runtime. Backfill them.
ALTER TABLE "parent_stat_submissions" ADD COLUMN IF NOT EXISTS "school" text;
ALTER TABLE "parent_stat_submissions" ADD COLUMN IF NOT EXISTS "flag_pulls" integer;
ALTER TABLE "parent_stat_submissions" ADD COLUMN IF NOT EXISTS "interceptions" integer;
ALTER TABLE "parent_stat_submissions" ADD COLUMN IF NOT EXISTS "passing_yards" integer;
ALTER TABLE "parent_stat_submissions" ADD COLUMN IF NOT EXISTS "rushing_yards" integer;
ALTER TABLE "parent_stat_submissions" ADD COLUMN IF NOT EXISTS "receiving_yards" integer;
ALTER TABLE "parent_stat_submissions" ADD COLUMN IF NOT EXISTS "broad_jump" double precision;
ALTER TABLE "parent_stat_submissions" ADD COLUMN IF NOT EXISTS "max_preps_url" text;
ALTER TABLE "parent_stat_submissions" ADD COLUMN IF NOT EXISTS "admin_notes" text;
