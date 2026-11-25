CREATE TABLE IF NOT EXISTS "warmer_pool" (
	"id" text PRIMARY KEY NOT NULL,
	"films" jsonb NOT NULL,
	"vectors" jsonb NOT NULL,
	"secret" text NOT NULL,
	"synced_at" timestamp with time zone NOT NULL
);
