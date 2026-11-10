ALTER TABLE "collage_puzzles" ADD COLUMN "date" date;--> statement-breakpoint
ALTER TABLE "collage_puzzles" ADD CONSTRAINT "collage_puzzles_date_unique" UNIQUE("date");