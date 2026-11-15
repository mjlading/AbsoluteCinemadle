/*
 * Pure choices for a day's board, every one driven by the seeded random
 * source so a day's board is the same however often it is built.
 */

export interface AnswerCandidate {
  seriesId: number;
  /** TMDB's first genre, for keeping a board varied. */
  genre: number | null;
  shape: number;
  /** The series' TMDB vote count, the measure of how well known it is. */
  voteCount: number;
}

export interface DecoyCandidate {
  seriesId: number;
  title: string;
  seasons: number;
}

export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** How strongly fame counts when drawing: odds grow with the square root of a series' TMDB votes. */
export const fameWeight = (voteCount: number) => Math.sqrt(Math.max(1, voteCount) / 1000);

/**
 * `items` in a random order where higher-weighted ones tend to come first (a weighted
 * shuffle: each gets the key u^(1/weight) and the keys are sorted, largest first).
 */
export function weightedShuffle<T>(items: readonly T[], weight: (item: T) => number, random: () => number): T[] {
  return items
    .map((item) => ({ item, key: Math.pow(random(), 1 / Math.max(1e-6, weight(item))) }))
    .sort((a, b) => b.key - a.key)
    .map(({ item }) => item);
}

/**
 * Up to `count` answers, drawn without replacement with odds growing with how much
 * their chart has to show (its shape score above `minShape`) and how well known they are,
 * and at most `maxSameGenre` sharing a main genre. Charts under `minShape` are never drawn.
 */
export function pickAnswers<T extends AnswerCandidate>(
  candidates: readonly T[],
  count: number,
  { minShape, maxSameGenre }: { minShape: number; maxSameGenre: number },
  random: () => number,
): T[] {
  let left = candidates.filter((c) => c.shape >= minShape);
  const picked: T[] = [];
  const perGenre = new Map<number | null, number>();
  while (picked.length < count && left.length > 0) {
    // Weight by how far above the floor the shape is, plus one so a just-qualifying chart still has a chance.
    const weights = left.map((c) => (c.shape - minShape + 1) * fameWeight(c.voteCount));
    let r = random() * weights.reduce((a, b) => a + b, 0);
    let i = 0;
    while (i < left.length - 1 && r >= weights[i]) r -= weights[i++];
    const choice = left[i];
    picked.push(choice);
    perGenre.set(choice.genre, (perGenre.get(choice.genre) ?? 0) + 1);
    left = left.filter((c) => c.seriesId !== choice.seriesId && (perGenre.get(c.genre) ?? 0) < maxSameGenre);
  }
  return picked;
}

/**
 * `count` wrong options for a series with `seasons` seasons: the candidates whose season
 * count is nearest, with a little randomness so equal ones take turns. `exclude` holds
 * series that may not appear (the board's answers, decoys already used).
 */
export function pickDecoys(
  seasons: number,
  candidates: readonly DecoyCandidate[],
  exclude: ReadonlySet<number>,
  count: number,
  random: () => number,
): DecoyCandidate[] {
  const titles = new Set<string>();
  return candidates
    .filter((c) => !exclude.has(c.seriesId))
    .map((c) => ({ c, distance: Math.abs(c.seasons - seasons) + random() * 1.5 }))
    .sort((a, b) => a.distance - b.distance)
    .map(({ c }) => c)
    .filter((c) => {
      // Two series sharing a title (remakes) would be two identical buttons.
      const key = c.title.toLowerCase();
      if (titles.has(key)) return false;
      titles.add(key);
      return true;
    })
    .slice(0, count);
}

/** A short opaque id for an option, which says nothing about the series. */
export function optionId(random: () => number): string {
  return Math.floor(random() * 36 ** 6)
    .toString(36)
    .padStart(6, "0");
}
