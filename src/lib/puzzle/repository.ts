import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db/client";
import { barcodeUploads, films, puzzleFilms, puzzles, tiles, warmupEntries } from "@/db/schema";
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
      barcodeId: puzzleFilms.barcodeId,
      palette: films.palette,
      uploadType: barcodeUploads.contentType,
    })
    .from(puzzleFilms)
    .innerJoin(films, eq(films.tmdbId, puzzleFilms.filmId))
    .leftJoin(
      barcodeUploads,
      and(eq(barcodeUploads.puzzleId, puzzleFilms.puzzleId), eq(barcodeUploads.filmId, puzzleFilms.filmId)),
    )
    .where(eq(puzzleFilms.puzzleId, id))
    .orderBy(asc(puzzleFilms.tier));

  const tileRows = await db()
    .select({ id: tiles.id, filmId: tiles.filmId, type: tiles.type, label: tiles.label, image: tiles.image })
    .from(tiles)
    .where(eq(tiles.puzzleId, id))
    .orderBy(asc(tiles.id));

  const warmupRows = await db()
    .select({
      id: warmupEntries.id,
      position: warmupEntries.position,
      filmId: warmupEntries.filmId,
      foreignTitle: warmupEntries.foreignTitle,
      language: warmupEntries.language,
      country: warmupEntries.country,
      literalTranslation: warmupEntries.literalTranslation,
      title: films.title,
      originalTitle: films.originalTitle,
      year: films.year,
      posterPath: films.posterPath,
    })
    .from(warmupEntries)
    .innerJoin(films, eq(films.tmdbId, warmupEntries.filmId))
    .where(eq(warmupEntries.puzzleId, id))
    .orderBy(asc(warmupEntries.position));

  return {
    id: row.id,
    date: row.date,
    films: filmRows.map(({ barcodeId, palette, uploadType, ...f }) => ({
      ...f,
      tier: f.tier as Tier,
      barcode: { id: barcodeId, colors: palette, upload: uploadType !== null },
    })),
    tiles: shuffled(tileRows, seededRandom(row.id)),
    warmup: warmupRows.map(({ title, originalTitle, year, posterPath, ...entry }) => ({
      ...entry,
      answer: { title, originalTitle, year, posterPath },
    })),
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

/** The barcode image an admin uploaded for one film of a puzzle, if any. */
export async function getBarcodeUpload(
  puzzleId: string,
  filmId: number,
): Promise<{ contentType: string; data: Buffer } | null> {
  const [row] = await db()
    .select({ contentType: barcodeUploads.contentType, data: barcodeUploads.data })
    .from(barcodeUploads)
    .where(and(eq(barcodeUploads.puzzleId, puzzleId), eq(barcodeUploads.filmId, filmId)));
  return row ?? null;
}
