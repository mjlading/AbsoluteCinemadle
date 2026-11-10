CREATE TABLE "soundbytes_boards" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"position" smallint NOT NULL,
	"date" date,
	"answer" jsonb NOT NULL,
	"nodes" jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "soundbytes_boards_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "soundbytes_clips" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"content_type" text NOT NULL,
	"data" "bytea" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "soundbytes_clips" ADD CONSTRAINT "soundbytes_clips_board_id_soundbytes_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."soundbytes_boards"("id") ON DELETE cascade ON UPDATE no action;