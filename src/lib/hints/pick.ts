import type { PuzzleFilm } from "@/lib/puzzle/types";
import { seededRandom, shuffled } from "@/lib/random";

/**
 * Picks the next hint of one kind for a player: from a film they haven't
 * solved, and not one they already have. The films that have this kind of hint
 * are put in a fixed order per puzzle (from `seed`); a hint's position in that
 * order is its token, which stays the same as the player solves films. Returns
 * null when no new hint is left.
 */
export function pickHint<F extends "soundHint" | "reviewHint">(
  films: readonly PuzzleFilm[],
  field: F,
  seed: string,
  solved: readonly number[],
  seen: readonly number[],
): (NonNullable<PuzzleFilm[F]> & { token: number }) | null {
  const order = shuffled(
    films.filter((f) => f[field]),
    seededRandom(seed),
  );
  const token = order.findIndex((film, index) => !solved.includes(film.tmdbId) && !seen.includes(index));
  return token === -1 ? null : { ...order[token][field]!, token };
}
