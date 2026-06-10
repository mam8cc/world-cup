CREATE TABLE IF NOT EXISTS "assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"pool_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"team" text NOT NULL,
	CONSTRAINT "assignments_pool_id_team_unique" UNIQUE("pool_id","team")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "matches" (
	"feed_key" text PRIMARY KEY NOT NULL,
	"round" text NOT NULL,
	"stage" text NOT NULL,
	"date" text NOT NULL,
	"group_letter" text,
	"team1" text NOT NULL,
	"team2" text NOT NULL,
	"ft1" integer,
	"ft2" integer,
	"winner" text,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meta" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"pool_id" integer NOT NULL,
	"display_name" text NOT NULL,
	"player_token" text NOT NULL,
	"draft_order" integer,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_player_token_unique" UNIQUE("player_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pools" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"format" text NOT NULL,
	"join_code" text NOT NULL,
	"admin_token" text NOT NULL,
	"status" text DEFAULT 'setup' NOT NULL,
	"lock_at" timestamp with time zone,
	"settings" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pools_join_code_unique" UNIQUE("join_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"kind" text NOT NULL,
	"slot" text NOT NULL,
	"team" text NOT NULL,
	CONSTRAINT "predictions_player_id_kind_slot_unique" UNIQUE("player_id","kind","slot")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "survivor_picks" (
	"id" serial PRIMARY KEY NOT NULL,
	"pool_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"pick_date" text NOT NULL,
	"team" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "survivor_picks_pool_id_player_id_pick_date_unique" UNIQUE("pool_id","player_id","pick_date"),
	CONSTRAINT "survivor_picks_pool_id_team_unique" UNIQUE("pool_id","team")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"group_letter" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assignments" ADD CONSTRAINT "assignments_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assignments" ADD CONSTRAINT "assignments_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "players" ADD CONSTRAINT "players_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "predictions" ADD CONSTRAINT "predictions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "survivor_picks" ADD CONSTRAINT "survivor_picks_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "survivor_picks" ADD CONSTRAINT "survivor_picks_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
