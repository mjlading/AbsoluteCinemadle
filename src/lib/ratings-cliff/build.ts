import "server-only";

import { and, between, ne } from "drizzle-orm";

import { RULES } from "@/config/rules";
import { db } from "@/db/client";
import { collagePuzzles, ratingsCliffBoards } from "@/db/schema";
import { addDays } from "@/lib/dates";
import { seededRandom } from "@/lib/random";
import { revealLine, shapeScore, toPublicSeasons, type ChartSeason } from "./chart";
import { fameWeight, optionId, pickAnswers, pickDecoys, shuffled, weightedShuffle } from "./pick";
import { getMostVotedSeries, getSeasonEpisodes, getSeriesDetails, type PoolSeries, type SeriesDetails } from "./tmdb";
import type { RatingsCliffRound } from "./types";

/*
 * Builds a day's board from TMDB. Only the pool list is fetched whole; a
 * seeded sample of series is looked up, and only some of those get every
 * season fetched, so a build stays at roughly 150 TMDB requests.
 */

const B = RULES.ratingsCliff.board;
/** Requests in flight at once; TMDB allows about 40 a second. */
const CONCURRENCY = 12;

/** Runs `fn` over `items` with at most `limit` running at a time, keeping the order. */
async function mapLimited<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** Whether a series from the pool may be on a board at all, by its language and genres. */
export function poolAllows(s: PoolSeries): boolean {
  const english = s.language === "en";
  if (!english && s.voteCount < B.foreignMinVotes) return false;
  if (s.genreIds.some((g) => (B.excludedGenres as readonly number[]).includes(g))) return false;
  if (!english && s.genreIds.includes(B.animationGenre)) return false;
  return true;
}

const airedBy = (airDate: string | null, date: string) => airDate !== null && airDate <= date;

/** Regular seasons that had started airing by `date`. */
const airedSeasons = (d: SeriesDetails, date: string) =>
  d.seasons.filter((s) => s.episodeCount > 0 && airedBy(s.airDate, date));

interface Charted {
  details: SeriesDetails;
  seasons: ChartSeason[];
  shape: number;
}

/**
 * A series' chart as of `date`, or null when it doesn't qualify: too few votes on too many
 * episodes, too few or too many episodes, or fewer than two seasons left once thin ones are out.
 */
async function chartOf(details: SeriesDetails, date: string): Promise<Charted | null> {
  const seasons = airedSeasons(details, date);
  if (seasons.length < B.minSeasons) return null;
  const lists = await mapLimited(seasons, 4, (s) => getSeasonEpisodes(details.seriesId, s.number));
  let aired = 0;
  let thin = 0;
  const chart: ChartSeason[] = [];
  seasons.forEach((s, i) => {
    const episodes = lists[i]
      .filter((e) => airedBy(e.airDate, date))
      .map((e) => {
        aired++;
        if (e.voteCount < B.episodeMinVotes) thin++;
        return e;
      })
      .filter((e) => e.voteCount >= B.episodeMinVotes)
      .map((e) => ({ episode: e.episode, rating: Math.round(e.voteAverage * 10) / 10, votes: e.voteCount }));
    if (episodes.length > 0) chart.push({ number: s.number, episodes });
  });
  const count = chart.reduce((n, s) => n + s.episodes.length, 0);
  if (aired === 0 || thin / aired > B.maxThinShare) return null;
  if (chart.length < B.minSeasons || count < B.minEpisodes || count > B.maxEpisodes) return null;
  return { details, seasons: chart, shape: shapeScore(toPublicSeasons(chart)) };
}

/**
 * Series that may not be an answer on `date`: the answers on boards already stored within
 * `days` either side, and any series that is a Close-Ups answer in that window, so a player
 * doesn't meet one show in two games in the same fortnight. Which neighbours exist depends on
 * which days were built first; a day's board, once stored, doesn't change.
 */
async function recentAnswers(date: string, days: number): Promise<Set<number>> {
  const from = addDays(date, -days);
  const to = addDays(date, days);
  const [boards, puzzles] = await Promise.all([
    db()
      .select({ rounds: ratingsCliffBoards.rounds })
      .from(ratingsCliffBoards)
      .where(and(between(ratingsCliffBoards.date, from, to), ne(ratingsCliffBoards.date, date))),
    db()
      .select({ answer: collagePuzzles.answer })
      .from(collagePuzzles)
      .where(between(collagePuzzles.date, from, to)),
  ]);
  const ids = new Set<number>();
  for (const { rounds } of boards) for (const r of rounds) ids.add(r.seriesId);
  for (const { answer } of puzzles) if (answer.mediaType === "tv") ids.add(answer.tmdbId);
  return ids;
}

const yearOf = (d: string | null) => (d ? Number(d.slice(0, 4)) : null);

/**
 * A day's board. A series isn't the answer again within `cooldownDays` either side; when the days
 * around are so full that too few series are left, the window shrinks step by step
 * (`cooldownFallbackDays`) rather than leave the day without a board.
 */
export async function buildRatingsCliffBoard(seed: string, date: string): Promise<RatingsCliffRound[]> {
  const pages = await mapLimited(
    Array.from({ length: B.poolPages }, (_, i) => i + 1),
    CONCURRENCY,
    (page) => getMostVotedSeries(page, B.excludedGenres),
  );
  const seen = new Set<number>();
  const pool = pages.flat().filter((s) => !seen.has(s.seriesId) && seen.add(s.seriesId) && poolAllows(s));
  for (const [i, days] of [B.cooldownDays, ...B.cooldownFallbackDays].entries()) {
    const cooling = await recentAnswers(date, days);
    // The first try keeps the day's own seed, so a board is the same however often it is built.
    const rounds = await tryBoard(seededRandom(i === 0 ? seed : `${seed}:${days}`), date, pool, cooling);
    if (rounds) return rounds;
  }
  throw new Error(`Ratings Cliff found too few series for ${date}, even with the shortest cooldown.`);
}

/** A board drawn from `pool` with no answer in `cooling`, or null when too few series qualify. */
async function tryBoard(
  random: () => number,
  date: string,
  pool: PoolSeries[],
  cooling: Set<number>,
): Promise<RatingsCliffRound[] | null> {
  // Better-known series are more likely to be looked up, so they come up more often as answers and wrong options.
  // Series that are cooling down are left out first, so the ones looked up can all be answers.
  const sample = weightedShuffle(
    pool.filter((s) => !cooling.has(s.seriesId)),
    (s) => fameWeight(s.voteCount),
    random,
  ).slice(0, B.candidates);
  const votes = new Map(sample.map((s) => [s.seriesId, s.voteCount]));
  const details = (await mapLimited(sample, CONCURRENCY, (s) => getSeriesDetails(s.seriesId))).filter(
    (d) => d.type === "Scripted" && airedBy(d.firstAirDate, date),
  );

  // Charts are fetched in batches until there are enough to choose from, at most maxChartFetches,
  // or more only while there are still too few for a board.
  const maybe = details.filter((d) => {
    const seasons = airedSeasons(d, date);
    const episodes = seasons.reduce((n, s) => n + s.episodeCount, 0);
    return seasons.length >= B.minSeasons && episodes >= B.minEpisodes && episodes <= B.maxEpisodes * 1.2;
  });
  const charted: Charted[] = [];
  let fetched = 0;
  const qualifying = () => charted.filter((c) => c.shape >= B.minShape && !cooling.has(c.details.seriesId)).length;
  while (fetched < maybe.length && (fetched < B.maxChartFetches || qualifying() < RULES.ratingsCliff.rounds)) {
    const batch = maybe.slice(fetched, fetched + 4);
    fetched += batch.length;
    const charts = await mapLimited(batch, 4, (d) => chartOf(d, date));
    charted.push(...charts.filter((c): c is Charted => c !== null));
  }

  const answers = pickAnswers(
    charted
      .filter((c) => !cooling.has(c.details.seriesId))
      .map((c) => ({
        ...c,
        seriesId: c.details.seriesId,
        genre: c.details.genreIds[0] ?? null,
        voteCount: votes.get(c.details.seriesId) ?? 0,
      })),
    RULES.ratingsCliff.rounds,
    { minShape: B.minShape, maxSameGenre: B.maxSameGenre },
    random,
  );
  if (answers.length < RULES.ratingsCliff.rounds) return null;

  const answerTitles = new Set(answers.map((a) => a.details.title.toLowerCase()));
  const decoyPool = details
    .filter((d) => !answerTitles.has(d.title.toLowerCase()))
    .map((d) => ({ seriesId: d.seriesId, title: d.title, seasons: Math.max(1, airedSeasons(d, date).length) }));
  const used = new Set(answers.map((a) => a.details.seriesId));
  const ids = new Set<string>();

  return answers.map((a) => {
    const decoys = pickDecoys(a.seasons.length, decoyPool, used, RULES.ratingsCliff.options - 1, random);
    if (decoys.length < RULES.ratingsCliff.options - 1) throw new Error("Ratings Cliff ran out of wrong options.");
    decoys.forEach((d) => used.add(d.seriesId));
    const options = shuffled(
      [
        { seriesId: a.details.seriesId, title: a.details.title },
        ...decoys.map((d) => ({ seriesId: d.seriesId, title: d.title })),
      ],
      random,
    ).map((o) => {
      let id = optionId(random);
      while (ids.has(id)) id = optionId(random);
      ids.add(id);
      return { ...o, id };
    });
    return {
      seriesId: a.details.seriesId,
      title: a.details.title,
      firstYear: yearOf(a.details.firstAirDate),
      lastYear: yearOf(a.details.lastAirDate),
      seasons: a.seasons,
      options,
      answer: options.find((o) => o.seriesId === a.details.seriesId)!.id,
      reveal: revealLine(a.seasons),
    };
  });
}
