import { z } from "zod";

import { RULES } from "@/config/rules";
import { COLLAGE_TIERS } from "./types";

/*
 * The shape of a keyword collage puzzle, checked when the collage lab's export
 * is imported (scripts/import-collage.mts) and again when the server reads it
 * back, so a bad row can never reach a player.
 */

const Fraction = z.number().min(0).max(1);
const Crop = z.object({ x: Fraction, y: Fraction, width: Fraction.positive(), height: Fraction.positive() });
const Id = z.string().regex(/^[A-Za-z0-9-]{4,64}$/);

const TileImage = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("tmdb"),
    source: z.literal("backdrop"),
    path: z.string().regex(/^\/[\w.-]+$/),
    crop: Crop,
  }),
  // Emoji placeholders, for tests.
  z.object({ kind: z.literal("placeholder"), glyph: z.string().max(8), hue: z.number() }),
]);

export const CollageAnswerSchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string().min(1),
  originalTitle: z.string().nullable(),
  year: z.number().int().nullable(),
  posterPath: z.string().nullable(),
});

export const CollageKeywordsSchema = z
  .array(
    z.object({
      id: Id,
      label: z.string().min(1).max(40),
      tier: z.enum(COLLAGE_TIERS),
      free: z.boolean(),
      tiles: z
        .array(
          z.object({
            id: Id,
            image: TileImage,
            frame: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
          }),
        )
        .min(1),
    }),
  )
  .min(RULES.closeUps.keywordsPerPuzzle)
  .refine((keywords) => keywords.filter((k) => k.free).length === 1, "A puzzle needs exactly one free keyword.");

export const CollagePuzzleSchema = z.object({
  id: Id,
  name: z.string().min(1).max(60),
  answer: CollageAnswerSchema,
  keywords: CollageKeywordsSchema,
});

/** The file the collage lab exports (tools/collage-lab/export_demo.py). */
export const CollageExportSchema = z.object({ puzzles: z.array(CollagePuzzleSchema) });
