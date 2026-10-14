CREATE TABLE "llm_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purpose" text NOT NULL,
	"model" text NOT NULL,
	"status" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_micro_usd" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warmup_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"puzzle_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"film_id" integer NOT NULL,
	"foreign_title" text NOT NULL,
	"language" text NOT NULL,
	"country" text,
	"literal_translation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "warmup_entries_position_unique" UNIQUE("puzzle_id","position"),
	CONSTRAINT "warmup_entries_film_unique" UNIQUE("puzzle_id","film_id"),
	CONSTRAINT "warmup_entries_position_range" CHECK ("warmup_entries"."position" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "films" ADD COLUMN "original_title" text;--> statement-breakpoint
ALTER TABLE "warmup_entries" ADD CONSTRAINT "warmup_entries_puzzle_id_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warmup_entries" ADD CONSTRAINT "warmup_entries_film_id_films_tmdb_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("tmdb_id") ON DELETE no action ON UPDATE no action;