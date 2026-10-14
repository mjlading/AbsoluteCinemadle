import "server-only";

import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db/client";
import { films, puzzleFilms, puzzles, tiles } from "@/db/schema";
import { seededRandom, shuffled } from "@/lib/random";
import type { Puzzle, Tier } from "./types";

/** Cache tag for everything players read; admin edits invalidate it. */
export const PUZZLES_TAG = "puzzles";

/**
 * Loads a full puzzle, answers included. Tiles come back in display order:
 * shuffled with the puzzle id as seed, so the admin preview matches the live game.
 */
export async function loadPuzzle(id: string): Promise<Puzzle | null> {
  const [row] = await db().select().from(puzzles).where(eq(puzzles.id, id));
  if (!row) return null;

  const filmRows = await db()
    .select({
      tmdbId: films.tmdbId,
      title: films.title,
      year: films.year,
      posterPath: films.posterPath,
      tier: puzzleFilms.tier,
    })
    .from(puzzleFilms)
    .innerJoin(films, eq(films.tmdbId, puzzleFilms.filmId))
    .where(eq(puzzleFilms.puzzleId, id))
    .orderBy(asc(puzzleFilms.tier));

  const tileRows = await db()
    .select({ id: tiles.id, filmId: tiles.filmId, type: tiles.type, label: tiles.label, image: tiles.image })
    .from(tiles)
    .where(eq(tiles.puzzleId, id))
    .orderBy(asc(tiles.id));

  return {
    id: row.id,
    date: row.date,
    films: filmRows.map((f) => ({ ...f, tier: f.tier as Tier })),
    tiles: shuffled(tileRows, seededRandom(row.id)),
  };
}

/** The puzzle scheduled for a date, cached for players until an admin edit. */
export async function getScheduledPuzzle(date: string): Promise<Puzzle | null> {
  "use cache";
  cacheTag(PUZZLES_TAG);
  cacheLife("hours");

  const [row] = await db().select({ id: puzzles.id }).from(puzzles).where(eq(puzzles.date, date));
  return row ? loadPuzzle(row.id) : null;
}
