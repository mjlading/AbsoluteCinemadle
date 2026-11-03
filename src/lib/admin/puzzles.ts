import "server-only";

import { and, asc, count, desc, eq, gte, inArray, isNull, lte, type SQL } from "drizzle-orm";

import { RULES } from "@/config/rules";
import { db } from "@/db/client";
import {
  barcodeUploads,
  films,
  puzzleFilms,
  puzzles,
  reviewHints,
  soundHints,
  tiles,
  warmupEntries,
} from "@/db/schema";
import { generatePalette } from "@/lib/barcode/generate";
import { newTileId } from "@/lib/ids";
import { checkPuzzle } from "@/lib/puzzle/check";
import { loadPuzzle } from "@/lib/puzzle/repository";
import type { Tier, TileImage, TileType } from "@/lib/puzzle/types";
import { getMovie } from "@/lib/tmdb/cached";

/** A problem the admin can fix, shown next to the control that caused it. */
export class AdminError extends Error {}

export interface PuzzleSummary {
  id: string;
  date: string | null;
  films: { title: string; tier: number }[];
  tileCount: number;
}

async function summaries(where: SQL | undefined): Promise<PuzzleSummary[]> {
  const rows = await db()
    .select({ id: puzzles.id, date: puzzles.date, updatedAt: puzzles.updatedAt })
    .from(puzzles)
    .where(where)
    .orderBy(asc(puzzles.date), desc(puzzles.updatedAt));
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const filmRows = await db()
    .select({ puzzleId: puzzleFilms.puzzleId, title: films.title, tier: puzzleFilms.tier })
    .from(puzzleFilms)
    .innerJoin(films, eq(films.tmdbId, puzzleFilms.filmId))
    .where(inArray(puzzleFilms.puzzleId, ids))
    .orderBy(asc(puzzleFilms.tier));
  const tileCounts = await db()
    .select({ puzzleId: tiles.puzzleId, n: count() })
    .from(tiles)
    .where(inArray(tiles.puzzleId, ids))
    .groupBy(tiles.puzzleId);

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    films: filmRows.filter((f) => f.puzzleId === r.id).map(({ title, tier }) => ({ title, tier })),
    tileCount: tileCounts.find((c) => c.puzzleId === r.id)?.n ?? 0,
  }));
}

export function listScheduled(from: string, to: string): Promise<PuzzleSummary[]> {
  return summaries(and(gte(puzzles.date, from), lte(puzzles.date, to)));
}

export function listDrafts(): Promise<PuzzleSummary[]> {
  return summaries(isNull(puzzles.date));
}

export async function createDraft(): Promise<string> {
  const [row] = await db().insert(puzzles).values({}).returning({ id: puzzles.id });
  return row.id;
}

export async function deletePuzzle(id: string): Promise<void> {
  await db().delete(puzzles).where(eq(puzzles.id, id));
}

const touch = (puzzleId: string) => db().update(puzzles).set({ updatedAt: new Date() }).where(eq(puzzles.id, puzzleId));

/**
 * Stores a film's current TMDB details (TMDB data may be kept for 6 months at
 * most). Grid films also get their barcode the first time; warm-up films never
 * show one, so they skip downloading the stills it is built from.
 */
async function syncFilm(tmdbId: number, { barcode }: { barcode: boolean }): Promise<void> {
  const movie = await getMovie(tmdbId);
  const details: Omit<typeof films.$inferInsert, "tmdbId"> = {
    title: movie.title,
    originalTitle: movie.originalTitle,
    year: movie.year,
    posterPath: movie.posterPath,
    syncedAt: new Date(),
  };
  if (barcode) {
    const [existing] = await db().select({ palette: films.palette }).from(films).where(eq(films.tmdbId, tmdbId));
    if (!existing?.palette?.length) details.palette = await generatePalette(movie.backdrops);
  }
  await db()
    .insert(films)
    .values({ tmdbId, ...details })
    .onConflictDoUpdate({ target: films.tmdbId, set: details });
}

/** Adds a film to a tier, refreshing its TMDB details. */
export async function addFilm(puzzleId: string, tmdbId: number, tier: Tier): Promise<void> {
  const current = await db().select().from(puzzleFilms).where(eq(puzzleFilms.puzzleId, puzzleId));
  if (current.some((f) => f.filmId === tmdbId)) throw new AdminError("That film is already in this puzzle.");
  if (current.some((f) => f.tier === tier)) throw new AdminError(`Tier ${tier} already has a film.`);
  if (current.length >= RULES.grid.groupCount) throw new AdminError("This puzzle already has 4 films.");
  const [inWarmup] = await db()
    .select({ id: warmupEntries.id })
    .from(warmupEntries)
    .where(and(eq(warmupEntries.puzzleId, puzzleId), eq(warmupEntries.filmId, tmdbId)));
  if (inWarmup) throw new AdminError("That film is in the warm-up. A film can't be in both rounds.");

  await syncFilm(tmdbId, { barcode: true });
  await db().insert(puzzleFilms).values({ puzzleId, filmId: tmdbId, tier });
  await touch(puzzleId);
}

/** Removes a film and, through the foreign key, its tiles. */
export async function removeFilm(puzzleId: string, filmId: number): Promise<void> {
  await db()
    .delete(puzzleFilms)
    .where(and(eq(puzzleFilms.puzzleId, puzzleId), eq(puzzleFilms.filmId, filmId)));
  await touch(puzzleId);
}

/** Moves a film to a tier, swapping with the film already there (the tier constraint is deferred). */
export async function setTier(puzzleId: string, filmId: number, tier: Tier): Promise<void> {
  await db().transaction(async (tx) => {
    const current = await tx.select().from(puzzleFilms).where(eq(puzzleFilms.puzzleId, puzzleId));
    const moving = current.find((f) => f.filmId === filmId);
    if (!moving) throw new AdminError("That film is not in this puzzle.");
    const occupant = current.find((f) => f.tier === tier && f.filmId !== filmId);
    if (occupant) {
      await tx
        .update(puzzleFilms)
        .set({ tier: moving.tier })
        .where(and(eq(puzzleFilms.puzzleId, puzzleId), eq(puzzleFilms.filmId, occupant.filmId)));
    }
    await tx
      .update(puzzleFilms)
      .set({ tier })
      .where(and(eq(puzzleFilms.puzzleId, puzzleId), eq(puzzleFilms.filmId, filmId)));
  });
  await touch(puzzleId);
}

export interface NewTile {
  filmId: number;
  type: TileType;
  image: TileImage;
  label: string;
}

export async function addTile(puzzleId: string, tile: NewTile): Promise<void> {
  const [{ n }] = await db()
    .select({ n: count() })
    .from(tiles)
    .where(and(eq(tiles.puzzleId, puzzleId), eq(tiles.filmId, tile.filmId)));
  if (n >= RULES.grid.groupSize) {
    throw new AdminError(`This film already has ${RULES.grid.groupSize} tiles. Remove one first.`);
  }
  await db()
    .insert(tiles)
    .values({ id: newTileId(), puzzleId, ...tile });
  await touch(puzzleId);
}

export async function updateTileLabel(puzzleId: string, tileId: string, label: string): Promise<void> {
  await db()
    .update(tiles)
    .set({ label })
    .where(and(eq(tiles.puzzleId, puzzleId), eq(tiles.id, tileId)));
  await touch(puzzleId);
}

export async function deleteTile(puzzleId: string, tileId: string): Promise<void> {
  await db()
    .delete(tiles)
    .where(and(eq(tiles.puzzleId, puzzleId), eq(tiles.id, tileId)));
  await touch(puzzleId);
}

export async function schedule(puzzleId: string, date: string): Promise<void> {
  const puzzle = await loadPuzzle(puzzleId);
  if (!puzzle) throw new AdminError("That puzzle no longer exists.");
  const { errors } = checkPuzzle(puzzle);
  if (errors.length > 0) throw new AdminError("Fix the problems listed above before scheduling.");

  const [taken] = await db().select({ id: puzzles.id }).from(puzzles).where(eq(puzzles.date, date));
  if (taken && taken.id !== puzzleId) throw new AdminError(`Another puzzle is already scheduled for ${date}.`);
  await db().update(puzzles).set({ date, updatedAt: new Date() }).where(eq(puzzles.id, puzzleId));
}

export async function unschedule(puzzleId: string): Promise<void> {
  await db().update(puzzles).set({ date: null, updatedAt: new Date() }).where(eq(puzzles.id, puzzleId));
}

export interface NewWarmupEntry {
  filmId: number;
  foreignTitle: string;
  language: string;
  country: string | null;
  literalTranslation: string;
}

/** Adds a warm-up card in the first free position. Its film may not be one of the grid films. */
export async function addWarmupEntry(puzzleId: string, entry: NewWarmupEntry): Promise<void> {
  const [inGrid] = await db()
    .select({ filmId: puzzleFilms.filmId })
    .from(puzzleFilms)
    .where(and(eq(puzzleFilms.puzzleId, puzzleId), eq(puzzleFilms.filmId, entry.filmId)));
  if (inGrid) throw new AdminError("That film is in the grid. Warm-up films must be different.");

  const existing = await db().select().from(warmupEntries).where(eq(warmupEntries.puzzleId, puzzleId));
  if (existing.some((e) => e.filmId === entry.filmId)) throw new AdminError("That film is already in the warm-up.");
  const taken = new Set(existing.map((e) => e.position));
  const position = Array.from({ length: RULES.warmup.titleCount }, (_, i) => i + 1).find((p) => !taken.has(p));
  if (!position) throw new AdminError(`The warm-up already has ${RULES.warmup.titleCount} titles.`);

  await syncFilm(entry.filmId, { barcode: false });
  await db()
    .insert(warmupEntries)
    .values({ id: newTileId(), puzzleId, position, ...entry });
  await touch(puzzleId);
}

export async function updateWarmupTranslation(puzzleId: string, entryId: string, literalTranslation: string) {
  await db()
    .update(warmupEntries)
    .set({ literalTranslation })
    .where(and(eq(warmupEntries.puzzleId, puzzleId), eq(warmupEntries.id, entryId)));
  await touch(puzzleId);
}

export async function removeWarmupEntry(puzzleId: string, entryId: string): Promise<void> {
  await db()
    .delete(warmupEntries)
    .where(and(eq(warmupEntries.puzzleId, puzzleId), eq(warmupEntries.id, entryId)));
  await touch(puzzleId);
}

/** Rebuilds a film's barcode from its current TMDB backdrops. */
export async function regeneratePalette(filmId: number): Promise<void> {
  const movie = await getMovie(filmId);
  const palette = await generatePalette(movie.backdrops);
  if (palette.length === 0) throw new AdminError("TMDB has no stills to build a barcode from. Upload one instead.");
  await db().update(films).set({ palette }).where(eq(films.tmdbId, filmId));
}

export async function saveBarcodeUpload(puzzleId: string, filmId: number, contentType: string, data: Buffer) {
  await db()
    .insert(barcodeUploads)
    .values({ puzzleId, filmId, contentType, data })
    .onConflictDoUpdate({
      target: [barcodeUploads.puzzleId, barcodeUploads.filmId],
      set: { contentType, data, createdAt: new Date() },
    });
  await touch(puzzleId);
}

export async function removeBarcodeUpload(puzzleId: string, filmId: number): Promise<void> {
  await db()
    .delete(barcodeUploads)
    .where(and(eq(barcodeUploads.puzzleId, puzzleId), eq(barcodeUploads.filmId, filmId)));
  await touch(puzzleId);
}

export async function saveSoundHint(
  puzzleId: string,
  filmId: number,
  hint: { youtubeId: string; start: number; end: number },
): Promise<void> {
  if (hint.end <= hint.start) throw new AdminError("The clip has to end after it starts.");
  if (hint.end - hint.start > 6) throw new AdminError("Keep the clip to a few seconds; the hint is meant to be short.");
  const values = { youtubeId: hint.youtubeId, startSeconds: hint.start, endSeconds: hint.end };
  await db()
    .insert(soundHints)
    .values({ puzzleId, filmId, ...values })
    .onConflictDoUpdate({ target: [soundHints.puzzleId, soundHints.filmId], set: values });
  await touch(puzzleId);
}

export async function removeSoundHint(puzzleId: string, filmId: number): Promise<void> {
  await db()
    .delete(soundHints)
    .where(and(eq(soundHints.puzzleId, puzzleId), eq(soundHints.filmId, filmId)));
  await touch(puzzleId);
}

export async function saveReviewHint(
  puzzleId: string,
  filmId: number,
  hint: { excerpt: string; author: string },
): Promise<void> {
  await db()
    .insert(reviewHints)
    .values({ puzzleId, filmId, ...hint })
    .onConflictDoUpdate({ target: [reviewHints.puzzleId, reviewHints.filmId], set: hint });
  await touch(puzzleId);
}

export async function removeReviewHint(puzzleId: string, filmId: number): Promise<void> {
  await db()
    .delete(reviewHints)
    .where(and(eq(reviewHints.puzzleId, puzzleId), eq(reviewHints.filmId, filmId)));
  await touch(puzzleId);
}
