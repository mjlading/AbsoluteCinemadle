import { RULES } from "@/config/rules";

/*
 * The seeded choices behind a Carbon Dating board, kept pure so they are unit-tested.
 * Every random number comes from the board's seeded generator.
 */

export type Rand = () => number;

/** A copy of the list in a random order (Fisher-Yates). */
export function shuffle<T>(rand: Rand, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface Decade {
  from: number;
  minVotes: number;
}

/**
 * The decades a board's rounds come from, in play order: `count` different ones,
 * leaving out any that haven't started by `year`. Shuffled, so the board doesn't run in order.
 */
export function pickDecades(rand: Rand, decades: readonly Decade[], count: number, year: number): Decade[] {
  return shuffle(
    rand,
    decades.filter((d) => d.from <= year),
  ).slice(0, count);
}

export interface Backdrop {
  file_path: string;
  width: number;
  height: number;
  vote_average: number;
  vote_count: number;
}

/** The backdrops fit to show: wide (about 16:9) and big enough for w1280. */
export function usableBackdrops(backdrops: readonly Backdrop[]): Backdrop[] {
  return backdrops.filter((b) => {
    const ratio = b.width / b.height;
    return b.width >= RULES.carbonDating.minBackdropWidth && ratio > 1.7 && ratio < 1.8;
  });
}

/**
 * One backdrop among a film's best few: frame-sized ones first (4K ones are
 * mostly key art), then by votes. Null when the film has too few usable ones
 * (often a sign of poor or odd stills).
 */
export function pickBackdrop(rand: Rand, backdrops: readonly Backdrop[]): Backdrop | null {
  const usable = usableBackdrops(backdrops);
  if (usable.length < RULES.carbonDating.minBackdrops) return null;
  const keyArt = (b: Backdrop) => (b.width >= RULES.carbonDating.keyArtWidth ? 1 : 0);
  const best = usable
    .sort((a, b) => keyArt(a) - keyArt(b) || b.vote_count - a.vote_count || b.vote_average - a.vote_average)
    .slice(0, RULES.carbonDating.backdropChoices);
  return best[Math.floor(rand() * best.length)];
}
