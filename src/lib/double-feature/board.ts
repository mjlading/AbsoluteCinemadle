import "server-only";

import { cacheLife } from "next/cache";
import { z } from "zod";

import { RULES } from "@/config/rules";
import { addDays, isIsoDate } from "@/lib/dates";
import { BoardImagesSchema } from "@/lib/prototypes/images";
import type { BoardSpec } from "@/lib/prototypes/boards";
import { seededRandom } from "@/lib/random";
import { tmdb } from "@/lib/tmdb/api";
import { pickRounds, type CandidateFilm } from "./pick";
import { QUESTION_KINDS } from "./questions";

/*
 * Double Feature's board: ten pairs of well-known films, each with a question
 * and both answers, built from TMDB on a day's first request.
 */

const DiscoverPage = z.object({ results: z.array(z.object({ id: z.number() })) });

/** The ids of the films with the most TMDB votes, documentaries left out. */
async function getPool(size: number): Promise<number[]> {
  "use cache";
  cacheLife("days");
  const pages = Math.ceil(size / 20);
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      tmdb("/discover/movie", DiscoverPage, {
        sort_by: "vote_count.desc",
        include_adult: "false",
        without_genres: "99",
        language: "en-US",
        page: String(i + 1),
      }),
    ),
  );
  return [...new Set(results.flatMap((r) => r.results.map((m) => m.id)))].slice(0, size);
}

const MovieDetails = z.object({
  id: z.number(),
  title: z.string(),
  release_date: z.string().nullish(),
  runtime: z.number().nullish(),
  budget: z.number().nullish(),
  revenue: z.number().nullish(),
  vote_average: z.number().default(0),
  vote_count: z.number().default(0),
  poster_path: z.string().nullish(),
});

async function getDetails(tmdbId: number) {
  "use cache";
  cacheLife("days");
  return tmdb(`/movie/${tmdbId}`, MovieDetails, { language: "en-US" });
}

/** A film as the picker needs it, or null when it lacks a poster, a release date or a believable runtime. */
function toCandidate(m: z.infer<typeof MovieDetails>, date: string): CandidateFilm | null {
  const rules = RULES.doubleFeature.board;
  if (!m.poster_path || !m.release_date || !isIsoDate(m.release_date) || m.release_date > date) return null;
  if (!m.runtime || m.runtime < rules.minRuntimeMinutes) return null;
  const money = (n: number | null | undefined) => (n && n >= rules.minMoneyDollars ? n : null);
  // A recent film's box office is still growing.
  const settled = m.release_date <= addDays(date, -rules.revenueSettledDays);
  return {
    tmdbId: m.id,
    title: m.title,
    releaseDate: m.release_date,
    runtime: m.runtime,
    budget: money(m.budget),
    revenue: settled ? money(m.revenue) : null,
    rating: Math.round(m.vote_average * 10) / 10,
    voteCount: m.vote_count,
    posterPath: m.poster_path,
  };
}

async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

const FilmSchema = z.object({
  tmdbId: z.number(),
  title: z.string(),
  year: z.number(),
  value: z.number(),
  display: z.string(),
});

const DataSchema = z.object({
  rounds: z.array(
    z.object({
      kind: z.enum(QUESTION_KINDS),
      style: z.enum(["close", "surprise", "open"]),
      films: z.tuple([FilmSchema, FilmSchema]),
      correct: z.union([z.literal(0), z.literal(1)]),
    }),
  ),
  /** Round i's posters are images `${i}a` and `${i}b`. */
  images: BoardImagesSchema,
});

export type DoubleFeatureData = z.infer<typeof DataSchema>;

export const OPTION_IDS = ["a", "b"] as const;
export const imageId = (round: number, side: 0 | 1) => `${round}${OPTION_IDS[side]}`;

export const doubleFeatureSpec: BoardSpec<typeof DataSchema> = {
  game: "double-feature",
  version: 2,
  schema: DataSchema,
  async build(seed, date) {
    const rules = RULES.doubleFeature.board;
    const rng = seededRandom(seed);
    const pool = await getPool(rules.poolSize);
    // A seeded sample of the pool, so days differ.
    const sample = [...pool];
    for (let i = sample.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [sample[i], sample[j]] = [sample[j], sample[i]];
    }
    const details = await inBatches(sample.slice(0, rules.candidates), 20, (id) => getDetails(id).catch(() => null));
    const films = details.flatMap((d) => (d ? (toCandidate(d, date) ?? []) : []));
    const rounds = pickRounds(films, rng);
    const images: DoubleFeatureData["images"] = {};
    rounds.forEach((round, i) =>
      round.films.forEach((film, side) => {
        images[imageId(i, side as 0 | 1)] = { path: film.posterPath, size: "w342" };
      }),
    );
    return {
      rounds: rounds.map((r) => ({
        kind: r.kind,
        style: r.style,
        correct: r.correct,
        films: r.films.map(({ tmdbId, title, year, value, display }) => ({ tmdbId, title, year, value, display })) as [
          z.infer<typeof FilmSchema>,
          z.infer<typeof FilmSchema>,
        ],
      })),
      images,
    };
  },
};
