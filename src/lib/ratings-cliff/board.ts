import "server-only";

import { z } from "zod";

import type { BoardSpec } from "@/lib/prototypes/boards";
import { buildRatingsCliffBoard } from "./build";

/** A stored board, answers included; only the server ever reads it whole. */
export const RatingsCliffBoardSchema = z.object({
  rounds: z.array(
    z.object({
      seriesId: z.number(),
      title: z.string(),
      firstYear: z.number().nullable(),
      lastYear: z.number().nullable(),
      seasons: z.array(
        z.object({
          number: z.number(),
          episodes: z.array(z.object({ episode: z.number(), rating: z.number(), votes: z.number() })),
        }),
      ),
      options: z.array(z.object({ id: z.string(), seriesId: z.number(), title: z.string() })),
      answer: z.string(),
      reveal: z.string(),
    }),
  ),
});

export type RatingsCliffBoardData = z.infer<typeof RatingsCliffBoardSchema>;

export const ratingsCliffSpec: BoardSpec<typeof RatingsCliffBoardSchema> = {
  game: "ratings-cliff",
  version: 2,
  schema: RatingsCliffBoardSchema,
  build: buildRatingsCliffBoard,
};
