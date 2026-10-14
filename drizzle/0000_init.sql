CREATE TYPE "public"."tile_type" AS ENUM('headshot', 'still', 'empty_set', 'prop');--> statement-breakpoint
CREATE TABLE "films" (
	"tmdb_id" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"year" integer,
	"poster_path" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "puzzle_films" (
	"puzzle_id" uuid NOT NULL,
	"film_id" integer NOT NULL,
	"tier" smallint NOT NULL,
	CONSTRAINT "puzzle_films_puzzle_id_film_id_pk" PRIMARY KEY("puzzle_id","film_id"),
	CONSTRAINT "puzzle_films_tier_unique" UNIQUE("puzzle_id","tier") DEFERRABLE INITIALLY DEFERRED,
	CONSTRAINT "puzzle_films_tier_range" CHECK ("puzzle_films"."tier" between 1 and 4)
);
--> statement-breakpoint
CREATE TABLE "puzzles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "puzzles_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "tiles" (
	"id" text PRIMARY KEY NOT NULL,
	"puzzle_id" uuid NOT NULL,
	"film_id" integer NOT NULL,
	"type" "tile_type" NOT NULL,
	"image" jsonb NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "puzzle_films" ADD CONSTRAINT "puzzle_films_puzzle_id_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puzzle_films" ADD CONSTRAINT "puzzle_films_film_id_films_tmdb_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("tmdb_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiles" ADD CONSTRAINT "tiles_puzzle_film_fk" FOREIGN KEY ("puzzle_id","film_id") REFERENCES "public"."puzzle_films"("puzzle_id","film_id") ON DELETE cascade ON UPDATE no action;