CREATE TABLE "ratings_cliff_boards" (
	"id" text PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"rounds" jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_cliff_boards_date_unique" UNIQUE("date")
);
