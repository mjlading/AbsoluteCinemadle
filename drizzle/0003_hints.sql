CREATE TABLE "review_hints" (
	"puzzle_id" uuid NOT NULL,
	"film_id" integer NOT NULL,
	"excerpt" text NOT NULL,
	"author" text NOT NULL,
	CONSTRAINT "review_hints_puzzle_id_film_id_pk" PRIMARY KEY("puzzle_id","film_id")
);
--> statement-breakpoint
CREATE TABLE "sound_hints" (
	"puzzle_id" uuid NOT NULL,
	"film_id" integer NOT NULL,
	"youtube_id" text NOT NULL,
	"start_seconds" real NOT NULL,
	"end_seconds" real NOT NULL,
	CONSTRAINT "sound_hints_puzzle_id_film_id_pk" PRIMARY KEY("puzzle_id","film_id"),
	CONSTRAINT "sound_hints_window" CHECK ("sound_hints"."end_seconds" > "sound_hints"."start_seconds" and "sound_hints"."start_seconds" >= 0)
);
--> statement-breakpoint
ALTER TABLE "review_hints" ADD CONSTRAINT "review_hints_puzzle_film_fk" FOREIGN KEY ("puzzle_id","film_id") REFERENCES "public"."puzzle_films"("puzzle_id","film_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sound_hints" ADD CONSTRAINT "sound_hints_puzzle_film_fk" FOREIGN KEY ("puzzle_id","film_id") REFERENCES "public"."puzzle_films"("puzzle_id","film_id") ON DELETE cascade ON UPDATE no action;