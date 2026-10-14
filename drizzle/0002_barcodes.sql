CREATE TABLE "barcode_uploads" (
	"puzzle_id" uuid NOT NULL,
	"film_id" integer NOT NULL,
	"content_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "barcode_uploads_puzzle_id_film_id_pk" PRIMARY KEY("puzzle_id","film_id")
);
--> statement-breakpoint
ALTER TABLE "films" ADD COLUMN "palette" jsonb;--> statement-breakpoint
ALTER TABLE "puzzle_films" ADD COLUMN "barcode_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "barcode_uploads" ADD CONSTRAINT "barcode_uploads_puzzle_film_fk" FOREIGN KEY ("puzzle_id","film_id") REFERENCES "public"."puzzle_films"("puzzle_id","film_id") ON DELETE cascade ON UPDATE no action;