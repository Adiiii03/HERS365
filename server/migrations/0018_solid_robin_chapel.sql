CREATE TABLE "athlete_change_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"kind" text NOT NULL,
	"field" text,
	"current_value" text,
	"proposed_value" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "athlete_change_requests" ADD CONSTRAINT "athlete_change_requests_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_change_requests" ADD CONSTRAINT "athlete_change_requests_resolved_by_parents_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."parents"("id") ON DELETE no action ON UPDATE no action;