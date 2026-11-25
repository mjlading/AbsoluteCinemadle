CREATE TABLE "leaderboard_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"game" text NOT NULL,
	"date" date NOT NULL,
	"score" smallint NOT NULL,
	"won" smallint NOT NULL,
	"summary" text NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_entries_player_id_game_date_unique" UNIQUE("player_id","game","date")
);
--> statement-breakpoint
CREATE TABLE "leaderboard_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_players_name_key_unique" UNIQUE("name_key")
);
--> statement-breakpoint
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_player_id_leaderboard_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."leaderboard_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leaderboard_entries_game_date_index" ON "leaderboard_entries" USING btree ("game","date");--> statement-breakpoint
CREATE INDEX "leaderboard_entries_ip_hash_created_at_index" ON "leaderboard_entries" USING btree ("ip_hash","created_at");