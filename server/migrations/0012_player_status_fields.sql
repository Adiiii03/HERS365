ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "status" varchar(50) DEFAULT 'active' NOT NULL;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "activated_at" timestamp;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "deactivated_at" timestamp;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "pending_token" varchar(255);

DO $$ BEGIN
  ALTER TABLE "players" ADD CONSTRAINT "players_pending_token_unique" UNIQUE ("pending_token");
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;
