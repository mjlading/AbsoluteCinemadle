import { RULES } from "@/config/rules";
import type { GuessResult, PublicPuzzle, Puzzle, SolvedGroup } from "./types";

export function tileImageUrl(date: string, tileId: string): string {
  return `/api/puzzles/${date}/tiles/${tileId}/image`;
}

/** The only view of a puzzle the client gets before it has earned anything. */
export function toPublicPuzzle(puzzle: Puzzle): PublicPuzzle {
  return {
    date: puzzle.date,
    tiles: puzzle.tiles.map((tile, index) => ({
      id: tile.id,
      number: index + 1,
      type: tile.type,
      imageUrl: tileImageUrl(puzzle.date, tile.id),
    })),
  };
}

export function solvedGroup(puzzle: Puzzle, filmId: string): SolvedGroup {
  const film = puzzle.films.find((f) => f.id === filmId);
  if (!film) throw new Error(`Film ${filmId} is not in the puzzle for ${puzzle.date}`);
  return {
    filmId: film.id,
    title: film.title,
    year: film.year,
    tier: film.tier,
    tileIds: puzzle.tiles.filter((t) => t.filmId === film.id).map((t) => t.id),
  };
}

/** Every group, easiest first. */
export function solution(puzzle: Puzzle): SolvedGroup[] {
  return [...puzzle.films]
    .sort((a, b) => a.tier - b.tier)
    .map((film) => solvedGroup(puzzle, film.id));
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

  const filmCounts = new Map<string, number>();
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

/**
 * Structural problems that make a grid unplayable, as human-readable messages.
 * An empty list means the grid is valid.
 */
export function gridProblems(puzzle: Puzzle): string[] {
  const { groupCount, groupSize } = RULES.grid;
  const problems: string[] = [];

  if (puzzle.films.length !== groupCount) {
    problems.push(`Expected ${groupCount} films, found ${puzzle.films.length}.`);
  }
  const tiers = new Set(puzzle.films.map((f) => f.tier));
  if (tiers.size !== puzzle.films.length) problems.push("Each film needs its own difficulty tier.");

  if (puzzle.tiles.length !== groupCount * groupSize) {
    problems.push(`Expected ${groupCount * groupSize} tiles, found ${puzzle.tiles.length}.`);
  }
  for (const film of puzzle.films) {
    const count = puzzle.tiles.filter((t) => t.filmId === film.id).length;
    if (count !== groupSize) problems.push(`${film.title} has ${count} tiles instead of ${groupSize}.`);
  }
  const filmIds = new Set(puzzle.films.map((f) => f.id));
  for (const tile of puzzle.tiles) {
    if (!filmIds.has(tile.filmId)) problems.push(`Tile ${tile.id} belongs to no film in this puzzle.`);
  }
  if (new Set(puzzle.tiles.map((t) => t.id)).size !== puzzle.tiles.length) {
    problems.push("Tile ids must be unique.");
  }
  return problems;
}
