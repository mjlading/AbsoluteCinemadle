import "server-only";

import { and, desc, eq, isNotNull, lte } from "drizzle-orm";

import { db } from "@/db/client";
import { collagePuzzles } from "@/db/schema";
import { readCollagePuzzle } from "./puzzle-schema";
import type { CollageDay, CollagePuzzle } from "./types";

/*
 * Close-Ups puzzles live in the collage_puzzles table, loaded from the collage
 * lab's export with `npm run db:import-collage`. Each dated row is one day's
 * puzzle; undated rows (the old demos) are never shown. They hold answers and
 * TMDB paths, so they stay on the server.
 */

const toPuzzle = (row: typeof collagePuzzles.$inferSelect): CollagePuzzle =>
  readCollagePuzzle({ id: row.id, name: row.name, date: row.date, answer: row.answer, keywords: row.keywords });

/** Every day with a puzzle, newest first, up to and including `latest`. */
export async function listCollageDays(latest: string): Promise<CollageDay[]> {
  const rows = await db()
    .select({ id: collagePuzzles.id, date: collagePuzzles.date })
    .from(collagePuzzles)
    .where(and(isNotNull(collagePuzzles.date), lte(collagePuzzles.date, latest)))
    .orderBy(desc(collagePuzzles.date));
  return rows.map((r) => ({ id: r.id, date: r.date! }));
}

export async function getCollagePuzzleByDate(date: string): Promise<CollagePuzzle | null> {
  const [row] = await db().select().from(collagePuzzles).where(eq(collagePuzzles.date, date));
  return row ? toPuzzle(row) : null;
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
