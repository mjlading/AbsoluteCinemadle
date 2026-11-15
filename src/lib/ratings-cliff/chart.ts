/*
 * Pure facts about a series' ratings chart: the numbers behind the text
 * alternative, how interesting the chart's shape is, and the reveal line.
 * Nothing here names the series.
 */

export interface ChartEpisode {
  /** The episode's number within its season, as TMDB numbers it. */
  episode: number;
  /** TMDB's average, rounded to 0.1. */
  rating: number;
  votes: number;
}

export interface ChartSeason {
  number: number;
  /** In airing order, unaired and thinly voted episodes left out. */
  episodes: ChartEpisode[];
}

/** What the player sees of one season: its number and its episodes' ratings, nothing else. */
export interface PublicSeason {
  number: number;
  ratings: number[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const fmt = (n: number) => n.toFixed(1);

/** The value at quantile q (0 to 1) of numbers sorted ascending, interpolated. */
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export interface ChartStats {
  seasons: number;
  episodes: number;
  min: number;
  max: number;
  median: number;
  /** Each season's average rating, rounded to 0.1, in season order. */
  seasonMeans: { number: number; mean: number }[];
}

export function chartStats(seasons: PublicSeason[]): ChartStats {
  const all = seasons.flatMap((s) => s.ratings).sort((a, b) => a - b);
  return {
    seasons: seasons.length,
    episodes: all.length,
    min: all[0] ?? 0,
    max: all[all.length - 1] ?? 0,
    median: round1(quantile(all, 0.5)),
    seasonMeans: seasons.map((s) => ({ number: s.number, mean: round1(mean(s.ratings)) })),
  };
}

export const toPublicSeasons = (seasons: ChartSeason[]): PublicSeason[] =>
  seasons.map((s) => ({ number: s.number, ratings: s.episodes.map((e) => e.rating) }));

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The fair clue under the chart: "8 seasons, 73 episodes". */
export function chartClue(seasons: PublicSeason[]): string {
  const { seasons: s, episodes } = chartStats(seasons);
  return `${plural(s, "season")}, ${plural(episodes, "rated episode")}`;
}

/** The chart's text alternative, which never names the series. */
export function chartDescription(seasons: PublicSeason[]): string {
  const stats = chartStats(seasons);
  const averages = stats.seasonMeans.map((s) => `S${s.number} ${fmt(s.mean)}`).join(", ");
  return (
    `Episode ratings chart: ${plural(stats.seasons, "season")}, ${plural(stats.episodes, "episode")}; ` +
    `ratings from ${fmt(stats.min)} to ${fmt(stats.max)}. Season averages: ${averages}.`
  );
}

/**
 * How much there is to see in a chart: the spread of its ratings (5th to 95th percentile),
 * the gap between its best and worst seasons, and how far its best and worst episodes stand
 * out from the median. A flat chart scores near 1, Game of Thrones about 8.
 */
export function shapeScore(seasons: PublicSeason[]): number {
  const all = seasons.flatMap((s) => s.ratings).sort((a, b) => a - b);
  if (all.length === 0) return 0;
  const spread = quantile(all, 0.95) - quantile(all, 0.05);
  const means = seasons.map((s) => mean(s.ratings));
  const seasonGap = Math.max(...means) - Math.min(...means);
  const median = quantile(all, 0.5);
  const standout = all[all.length - 1] - median + (median - all[0]);
  return round1(spread + seasonGap + standout);
}

/** The episode with the highest (or lowest) rating; ties go to the one with more votes. */
function extreme(seasons: ChartSeason[], best: boolean): { season: number; e: ChartEpisode } {
  let found: { season: number; e: ChartEpisode } | null = null;
  for (const s of seasons) {
    for (const e of s.episodes) {
      if (
        !found ||
        (best ? e.rating > found.e.rating : e.rating < found.e.rating) ||
        (e.rating === found.e.rating && e.votes > found.e.votes)
      ) {
        found = { season: s.number, e };
      }
    }
  }
  if (!found) throw new Error("A chart needs at least one episode.");
  return found;
}

/**
 * One line for the reveal, built from the numbers: the best and worst episodes, and the
 * seasons' story when there is one (a last season that sank, or one that was the best).
 */
export function revealLine(seasons: ChartSeason[]): string {
  const best = extreme(seasons, true);
  const worst = extreme(seasons, false);
  const parts = [
    `Its best-rated episode is S${best.season} E${best.e.episode} at ${fmt(best.e.rating)}; ` +
      `its worst is S${worst.season} E${worst.e.episode} at ${fmt(worst.e.rating)}.`,
  ];
  const means = chartStats(toPublicSeasons(seasons)).seasonMeans;
  const last = means[means.length - 1];
  const first = means[0];
  const top = means.reduce((a, b) => (b.mean > a.mean ? b : a));
  const bottom = means.reduce((a, b) => (b.mean < a.mean ? b : a));
  if (means.length >= 2 && last === bottom && top.mean - last.mean >= 0.5) {
    parts.push(`Its final season averaged ${fmt(last.mean)}, against ${fmt(top.mean)} for season ${top.number}.`);
  } else if (means.length >= 2 && last === top && last.mean - first.mean >= 0.4) {
    parts.push(`It ended on its best season: S${last.number} averaged ${fmt(last.mean)}, S1 ${fmt(first.mean)}.`);
  } else if (means.length >= 3 && top !== last && top !== first && top.mean - bottom.mean >= 0.5) {
    parts.push(`Season ${top.number} was its peak, averaging ${fmt(top.mean)}.`);
  }
  return parts.join(" ");
}
