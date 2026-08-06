ALTER TABLE "payments" ALTER COLUMN "updated_at" SET DATA TYPE timestamp USING updated_at::timestamp;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "paid_at" SET DATA TYPE timestamp USING paid_at::timestamp;--> statement-breakpoint
ALTER TABLE "player_subscriptions" ALTER COLUMN "player_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "player_subscriptions" ALTER COLUMN "plan_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "player_subscriptions" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "player_subscriptions" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "player_subscriptions" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "player_subscriptions" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "player_subscriptions" ADD CONSTRAINT "player_subscriptions_player_id_unique" UNIQUE("player_id");