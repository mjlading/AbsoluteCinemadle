import { seededRandom } from "./random";
import type { Pool } from "./pool";

/*
 * Warmer's daily game: a hidden film, always one of the best-known, and every
 * guess ranked by how alike it is to it (#1 is the film itself). Hints give a
 * film halfway between the best guess so far and the answer, so nobody gets stuck.
 */

/** The hidden film comes from this many best-known films, in a fixed shuffled order: no repeat within a year. */
export const TARGETS = 365;
/** A first hint, with nothing guessed yet, lands at this rank. */
const FIRST_HINT_RANK = 300;

const EPOCH = Date.UTC(2026, 0, 1);
const dayIndex = (date: string) => Math.round((Date.parse(`${date}T00:00:00Z`) - EPOCH) / 86_400_000);

/** The day's hidden film, as a pool index. */
export function dailyTarget(pool: Pool, date: string, seed = "warmer-targets"): number {
  const famous = pool.films
    .map((f, i) => [i, f.votes] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TARGETS)
    .map(([i]) => i);
  const random = seededRandom(seed);
  for (let i = famous.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [famous[i], famous[j]] = [famous[j], famous[i]];
  }
  const n = famous.length;
  return famous[((dayIndex(date) % n) + n) % n];
}

/**
 * A hint: the film halfway (by rank) between the best guess and the answer, skipping films already
 * guessed; null when the best guess is already #2. `order` is the day's ranking, answer first.
 */
export function hintRank(order: number[], guessed: Set<number>, bestRank: number | null): number | null {
  const goal = bestRank === null ? FIRST_HINT_RANK : Math.floor(bestRank / 2);
  if (goal < 2) return null;
  for (let rank = goal; rank >= 2; rank--) if (!guessed.has(order[rank - 1])) return rank;
  return null;
}
