CREATE TABLE "casting_call_boards" (
	"id" text PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"person_ids" jsonb NOT NULL,
	"groups" jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "casting_call_boards_date_unique" UNIQUE("date")
);
