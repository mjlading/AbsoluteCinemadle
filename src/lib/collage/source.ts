import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { collagePuzzles } from "@/db/schema";
import { CollagePuzzleSchema } from "./puzzle-schema";
import type { CollagePuzzle } from "./types";

/*
 * Keyword collage puzzles live in the collage_puzzles table, loaded from the
 * collage lab's export with `npm run db:import-collage`. They hold answers and
 * TMDB paths, so they stay on the server; with no puzzles the game shows its preview.
 */

const toPuzzle = (row: typeof collagePuzzles.$inferSelect): CollagePuzzle =>
  CollagePuzzleSchema.parse({ id: row.id, name: row.name, answer: row.answer, keywords: row.keywords });

/** Just the ids and names, for the puzzle list. */
export async function listCollageNames(): Promise<{ id: string; name: string }[]> {
  return db()
    .select({ id: collagePuzzles.id, name: collagePuzzles.name })
    .from(collagePuzzles)
    .orderBy(asc(collagePuzzles.position));
}

export async function getCollagePuzzle(id: string): Promise<CollagePuzzle | null> {
  const [row] = await db().select().from(collagePuzzles).where(eq(collagePuzzles.id, id));
  return row ? toPuzzle(row) : null;
}

/** Loads the puzzle for a route's id param, or the error response to return instead. */
export async function collageOrErrorResponse(id: string): Promise<CollagePuzzle | Response> {
  const puzzle = await getCollagePuzzle(id);
  return puzzle ?? Response.json({ error: "There is no such puzzle." }, { status: 404 });
}
