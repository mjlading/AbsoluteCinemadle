CREATE TABLE "prototype_boards" (
	"id" text PRIMARY KEY NOT NULL,
	"game" text NOT NULL,
	"date" date NOT NULL,
	"version" integer NOT NULL,
	"data" jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prototype_boards_game_date_unique" UNIQUE("game","date")
);
