-- schema.ts declared these but no migration ever created them, so the rankings
-- routes and the guardian login-request flow failed at runtime against a DB
-- built purely from migrations.

CREATE TABLE IF NOT EXISTS "login_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "player_id" integer NOT NULL,
  "parent_id" integer,
  "relation_id" integer,
  "verification_code_id" integer,
  "status" text DEFAULT 'pending' NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "requested_at" timestamp DEFAULT now() NOT NULL,
  "approved_at" timestamp,
  "expires_at" timestamp NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "login_requests" ADD CONSTRAINT "login_requests_player_id_players_id_fk"
    FOREIGN KEY ("player_id") REFERENCES "public"."players"("id");
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "login_requests" ADD CONSTRAINT "login_requests_parent_id_parents_id_fk"
    FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id");
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "login_requests" ADD CONSTRAINT "login_requests_relation_id_parent_child_relations_id_fk"
    FOREIGN KEY ("relation_id") REFERENCES "public"."parent_child_relations"("id");
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "login_requests" ADD CONSTRAINT "login_requests_verification_code_id_guardian_verification_codes_id_fk"
    FOREIGN KEY ("verification_code_id") REFERENCES "public"."guardian_verification_codes"("id");
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "athlete_rankings" ADD COLUMN IF NOT EXISTS "tournament_performance_score" double precision;

ALTER TABLE "parent_stat_submissions" ALTER COLUMN "sacks" SET DATA TYPE double precision;
