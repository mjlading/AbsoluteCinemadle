import { RULES } from "@/config/rules";
import { posterUrl } from "@/lib/tmdb/images";
import { countryName, languageName } from "@/lib/warmup/names";
import type { GuessResult, PublicPuzzle, Puzzle, SolvedGroup, TileImage } from "./types";

/**
 * The only view of a puzzle the client gets before it has earned anything.
 * `apiBase` is where the client sends guesses and loads images, e.g. `/api/puzzles/2026-10-14`.
 */
export function toPublicPuzzle(puzzle: Puzzle, apiBase: string, date: string): PublicPuzzle {
  return {
    date,
    warmup: puzzle.warmup.map((entry) => ({
      id: entry.id,
      foreignTitle: entry.foreignTitle,
      language: entry.language,
      languageName: languageName(entry.language),
      countryName: entry.country ? countryName(entry.country) : null,
      literalTranslation: entry.literalTranslation,
    })),
    hints: {
      sound: puzzle.films.filter((f) => f.soundHint).length,
      review: puzzle.films.filter((f) => f.reviewHint).length,
    },
    tiles: puzzle.tiles.map((tile, index) => ({
      id: tile.id,
      number: index + 1,
      type: tile.type,
      imageUrl: `${apiBase}/tiles/${tile.id}/image`,
    })),
  };
}

export function solvedGroup(puzzle: Puzzle, filmId: number): SolvedGroup {
  const film = puzzle.films.find((f) => f.tmdbId === filmId);
  if (!film) throw new Error(`Film ${filmId} is not in puzzle ${puzzle.id}`);
  return {
    filmId: film.tmdbId,
    title: film.title,
    year: film.year,
    posterUrl: posterUrl(film.posterPath),
    tier: film.tier,
    tileIds: puzzle.tiles.filter((t) => t.filmId === film.tmdbId).map((t) => t.id),
  };
}

/** Every group, easiest first. */
export function solution(puzzle: Puzzle): SolvedGroup[] {
  return [...puzzle.films].sort((a, b) => a.tier - b.tier).map((film) => solvedGroup(puzzle, film.tmdbId));
}

export type CheckedGuess = GuessResult | { kind: "invalid"; reason: string };

export function checkGuess(puzzle: Puzzle, tileIds: readonly string[]): CheckedGuess {
  const { groupSize } = RULES.grid;
  if (tileIds.length !== groupSize) {
    return { kind: "invalid", reason: `A guess needs exactly ${groupSize} tiles.` };
  }
  if (new Set(tileIds).size !== tileIds.length) {
    return { kind: "invalid", reason: "A guess cannot repeat a tile." };
  }

  const filmCounts = new Map<number, number>();
  for (const id of tileIds) {
    const tile = puzzle.tiles.find((t) => t.id === id);
    if (!tile) return { kind: "invalid", reason: `Unknown tile ${id}.` };
    filmCounts.set(tile.filmId, (filmCounts.get(tile.filmId) ?? 0) + 1);
  }

  const [topFilmId, topCount] = [...filmCounts].sort((a, b) => b[1] - a[1])[0];
  if (topCount === groupSize) return { kind: "correct", group: solvedGroup(puzzle, topFilmId) };
  if (topCount === groupSize - 1) return { kind: "one_away" };
  return { kind: "wrong" };
}

export function tileLabel(puzzle: Puzzle, tileId: string): string | null {
  return puzzle.tiles.find((t) => t.id === tileId)?.label ?? null;
}

const imageSource = (image: TileImage) => (image.kind === "tmdb" ? image.path : `${image.glyph}`);
const imageKey = (image: TileImage) =>
  image.kind === "tmdb" ? `${image.path}@${JSON.stringify(image.crop)}` : `${image.glyph}@${image.hue}`;

export interface GridCheck {
  /** Problems that make the grid unplayable; scheduling is blocked until they are fixed. */
  errors: string[];
  /** Things worth a second look that do not block scheduling. */
  warnings: string[];
}

export function checkGrid(puzzle: Puzzle): GridCheck {
  const { groupCount, groupSize } = RULES.grid;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (puzzle.films.length !== groupCount) {
    errors.push(`Pick ${groupCount} films (${puzzle.films.length} so far).`);
  }
  if (new Set(puzzle.films.map((f) => f.tier)).size !== puzzle.films.length) {
    errors.push("Each film needs its own difficulty tier.");
  }
  for (const film of puzzle.films) {
    const count = puzzle.tiles.filter((t) => t.filmId === film.tmdbId).length;
    if (count !== groupSize) errors.push(`${film.title} has ${count} of ${groupSize} tiles.`);
  }
  const filmIds = new Set(puzzle.films.map((f) => f.tmdbId));
  if (puzzle.tiles.some((t) => !filmIds.has(t.filmId))) errors.push("Some tiles belong to no film in this puzzle.");
  if (new Set(puzzle.tiles.map((t) => t.id)).size !== puzzle.tiles.length) errors.push("Tile ids must be unique.");

  const byKey = Map.groupBy(puzzle.tiles, (t) => imageKey(t.image));
  if ([...byKey.values()].some((group) => group.length > 1)) {
    errors.push("The same picture is used for more than one tile.");
  }
  const bySource = Map.groupBy(puzzle.tiles, (t) => imageSource(t.image));
  const reused = [...bySource.values()].filter(
    (group) => group.length > 1 && new Set(group.map((t) => imageKey(t.image))).size > 1,
  );
  if (reused.length > 0) {
    warnings.push("Some tiles are different crops of the same picture, which can make them easy to pair up.");
  }

  // Identical type mixes let players solve by elimination (spec: never enforce one of each type).
  const mixes = puzzle.films.map((film) =>
    puzzle.tiles
      .filter((t) => t.filmId === film.tmdbId)
      .map((t) => t.type)
      .sort()
      .join(","),
  );
  if (puzzle.films.length === groupCount && errors.length === 0 && new Set(mixes).size === 1) {
    warnings.push("Every film has the same mix of tile types, which lets players solve by elimination.");
  }

  return { errors, warnings };
}
