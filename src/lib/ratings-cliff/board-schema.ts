import { z } from "zod";

import { RULES } from "@/config/rules";

/*
 * The shape of a stored Ratings Cliff board, checked when the server reads one
 * back and when hand-made boards (the E2E fixtures) are imported, so a bad row
 * can never reach a player.
 */

const ROUNDS = RULES.ratingsCliff.rounds;
const OPTIONS = RULES.ratingsCliff.options;

const RoundSchema = z.object({
  seriesId: z.number().int().positive(),
  title: z.string().min(1),
  firstYear: z.number().int().nullable(),
  lastYear: z.number().int().nullable(),
  seasons: z
    .array(
      z.object({
        number: z.number().int(),
        episodes: z
          .array(z.object({ episode: z.number(), rating: z.number().min(0).max(10), votes: z.number() }))
          .min(1),
      }),
    )
    .min(1),
  options: z
    .array(z.object({ id: z.string().min(1), seriesId: z.number().int().positive(), title: z.string() }))
    .length(OPTIONS),
  answer: z.string().min(1),
  reveal: z.string(),
});

/** A stored board, checked: a bad row can never reach a player. */
export const RatingsCliffBoardSchema = z
  .object({ id: z.string(), date: z.string(), rounds: z.array(RoundSchema).length(ROUNDS) })
  .refine(
    (b) => b.rounds.every((r) => r.options.some((o) => o.id === r.answer)),
    "Every answer is one of its options.",
  );
