CREATE TABLE "guardian_consents" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
	"player_id" integer,
	"consent_type" text NOT NULL,
	"framework" text NOT NULL,
	"consented" boolean NOT NULL,
	"consent_version" text NOT NULL,
	"consent_text" text NOT NULL,
	"method" text,
	"granted_at" timestamp DEFAULT now(),
	"revoked_at" timestamp,
	"expires_at" timestamp,
	"granted_by" text,
	"ip_address" text,
	"user_agent" text,
	"withdrawal_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "guardian_verification_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
	"player_id" integer,
	"relation_id" integer,
	"channel" text NOT NULL,
	"destination" text NOT NULL,
	"code_hash" text NOT NULL,
	"link_token" text,
	"purpose" text NOT NULL,
	"attempts" integer NOT NULL DEFAULT 0,
	"max_attempts" integer NOT NULL DEFAULT 5,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"used" boolean NOT NULL DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "guardian_verification_codes_link_token_unique" UNIQUE("link_token")
);
--> statement-breakpoint
CREATE TABLE "consent_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"consent_id" integer,
	"parent_id" integer,
	"player_id" integer,
	"action" text NOT NULL,
	"actor_type" text,
	"actor_id" integer,
	"ip_address" text,
	"user_agent" text,
	"detail" jsonb DEFAULT '{}'::jsonb,
	"prev_hash" text,
	"row_hash" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_access_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer,
	"action" text NOT NULL,
	"subject_type" text,
	"subject_id" integer,
	"fields" text,
	"count" integer,
	"ip_address" text,
	"user_agent" text,
	"prev_hash" text,
	"row_hash" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"source" text,
	"status" text NOT NULL DEFAULT 'pending',
	"parent_id" integer,
	"confirm_token" text,
	"confirmed_at" timestamp,
	"consent_at" timestamp DEFAULT now(),
	"unsubscribed_at" timestamp,
	"unsubscribe_token" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email"),
	CONSTRAINT "newsletter_subscribers_confirm_token_unique" UNIQUE("confirm_token"),
	CONSTRAINT "newsletter_subscribers_unsubscribe_token_unique" UNIQUE("unsubscribe_token")
);
--> statement-breakpoint
ALTER TABLE "guardian_consents" ADD CONSTRAINT "guardian_consents_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_consents" ADD CONSTRAINT "guardian_consents_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_verification_codes" ADD CONSTRAINT "guardian_verification_codes_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_verification_codes" ADD CONSTRAINT "guardian_verification_codes_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_verification_codes" ADD CONSTRAINT "guardian_verification_codes_relation_id_parent_child_relations_id_fk" FOREIGN KEY ("relation_id") REFERENCES "public"."parent_child_relations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_audit_log" ADD CONSTRAINT "consent_audit_log_consent_id_guardian_consents_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."guardian_consents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_access_log" ADD CONSTRAINT "admin_access_log_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guardian_verification_codes_destination_purpose_active_idx" ON "guardian_verification_codes" ("destination", "purpose") WHERE "used" = false;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "status" text NOT NULL DEFAULT 'pending_guardian';--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "activated_at" timestamp;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "deactivated_at" timestamp;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "pending_token" text;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_pending_token_unique" UNIQUE("pending_token");--> statement-breakpoint
ALTER TABLE "parents" ADD COLUMN "email_verified" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "parents" ADD COLUMN "phone_verified" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "parents" ADD COLUMN "phone_e164" text;--> statement-breakpoint
ALTER TABLE "parent_child_relations" ADD COLUMN "is_primary" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "parent_child_relations" ADD COLUMN "status" text NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "parent_child_relations" ADD COLUMN "consent_id" integer;--> statement-breakpoint
ALTER TABLE "parent_child_relations" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "parent_child_relations" ADD COLUMN "revoked_at" timestamp;--> statement-breakpoint
ALTER TABLE "parent_child_relations" ADD CONSTRAINT "parent_child_relations_consent_id_guardian_consents_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."guardian_consents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
UPDATE "players" SET "status" = 'active', "activated_at" = "created_at";--> statement-breakpoint
UPDATE "parent_child_relations" SET "status" = CASE WHEN "relationship" = 'pending' THEN 'pending' ELSE 'active' END;--> statement-breakpoint
-- Activation choke point: no player becomes active without a live guardian consent
-- and a verified parent link. Created AFTER the backfill so grandfathering is not blocked.
CREATE OR REPLACE FUNCTION enforce_player_activation() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    IF NOT EXISTS (
      SELECT 1 FROM guardian_consents gc
      WHERE gc.player_id = NEW.id AND gc.consented = true AND gc.revoked_at IS NULL
    ) OR NOT EXISTS (
      SELECT 1 FROM parent_child_relations pcr
      WHERE pcr.player_id = NEW.id AND pcr.status = 'verified'
    ) THEN
      RAISE EXCEPTION 'player % cannot be activated without verified guardian consent', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER players_activation_gate BEFORE INSERT OR UPDATE ON "players"
  FOR EACH ROW EXECUTE FUNCTION enforce_player_activation();--> statement-breakpoint
-- Append only enforcement. The raising trigger is the primary guard because the app
-- connects as the database owner locally; the REVOKEs harden any non owner role.
CREATE OR REPLACE FUNCTION forbid_row_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append only, % not allowed', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER consent_audit_log_immutable BEFORE UPDATE OR DELETE ON "consent_audit_log"
  FOR EACH ROW EXECUTE FUNCTION forbid_row_mutation();--> statement-breakpoint
CREATE TRIGGER admin_access_log_immutable BEFORE UPDATE OR DELETE ON "admin_access_log"
  FOR EACH ROW EXECUTE FUNCTION forbid_row_mutation();--> statement-breakpoint
CREATE OR REPLACE FUNCTION forbid_consent_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'guardian_consents rows are never deleted, revoke via revoked_at';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER guardian_consents_no_delete BEFORE DELETE ON "guardian_consents"
  FOR EACH ROW EXECUTE FUNCTION forbid_consent_delete();--> statement-breakpoint
REVOKE UPDATE, DELETE ON "consent_audit_log" FROM PUBLIC;--> statement-breakpoint
REVOKE UPDATE, DELETE ON "admin_access_log" FROM PUBLIC;--> statement-breakpoint
REVOKE DELETE ON "guardian_consents" FROM PUBLIC;
