import "server-only";

import { and, asc, count, desc, eq, gte, inArray, isNull, lte, type SQL } from "drizzle-orm";

import { RULES } from "@/config/rules";
import { db } from "@/db/client";
import { films, puzzleFilms, puzzles, tiles } from "@/db/schema";
import { newTileId } from "@/lib/ids";
import { checkGrid } from "@/lib/puzzle/grid";
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

/** Adds a film to a tier, refreshing its TMDB details (TMDB data may be kept for 6 months at most). */
export async function addFilm(puzzleId: string, tmdbId: number, tier: Tier): Promise<void> {
  const current = await db().select().from(puzzleFilms).where(eq(puzzleFilms.puzzleId, puzzleId));
  if (current.some((f) => f.filmId === tmdbId)) throw new AdminError("That film is already in this puzzle.");
  if (current.some((f) => f.tier === tier)) throw new AdminError(`Tier ${tier} already has a film.`);
  if (current.length >= RULES.grid.groupCount) throw new AdminError("This puzzle already has 4 films.");

  const movie = await getMovie(tmdbId);
  const details = { title: movie.title, year: movie.year, posterPath: movie.posterPath, syncedAt: new Date() };
  await db()
    .insert(films)
    .values({ tmdbId, ...details })
    .onConflictDoUpdate({ target: films.tmdbId, set: details });
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
  const { errors } = checkGrid(puzzle);
  if (errors.length > 0) throw new AdminError("Fix the problems listed above before scheduling.");

  const [taken] = await db().select({ id: puzzles.id }).from(puzzles).where(eq(puzzles.date, date));
  if (taken && taken.id !== puzzleId) throw new AdminError(`Another puzzle is already scheduled for ${date}.`);
  await db().update(puzzles).set({ date, updatedAt: new Date() }).where(eq(puzzles.id, puzzleId));
}

export async function unschedule(puzzleId: string): Promise<void> {
  await db().update(puzzles).set({ date: null, updatedAt: new Date() }).where(eq(puzzles.id, puzzleId));
}
