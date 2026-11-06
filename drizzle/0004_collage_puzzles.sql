CREATE TABLE "collage_puzzles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"position" smallint NOT NULL,
	"answer" jsonb NOT NULL,
	"keywords" jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
