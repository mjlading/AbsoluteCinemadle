import "server-only";

import { cacheLife } from "next/cache";
import { z } from "zod";

import { tmdb } from "@/lib/tmdb/api";
import { isActingCredit, isSelfCredit, type Candidate, type FilmRecord } from "./criteria";
import { DOCUMENTARY_GENRE } from "./themes";
import { RULES } from "@/config/rules";

/* Deep Cut's own TMDB lookups. */

const yearOf = (date: string | null | undefined) => {
  const year = Number(date?.slice(0, 4));
  return Number.isInteger(year) && year > 1800 ? year : null;
};

const ListedFilm = z.object({
  id: z.number(),
  title: z.string(),
  release_date: z.string().nullish(),
  vote_count: z.number().default(0),
  vote_average: z.number().default(0),
  genre_ids: z.array(z.number()).default([]),
});
type ListedFilm = z.infer<typeof ListedFilm>;

const toCandidate = (f: ListedFilm, order?: number): Candidate => ({
  tmdbId: f.id,
  title: f.title,
  year: yearOf(f.release_date),
  voteCount: f.vote_count,
  voteAverage: f.vote_average,
  genreIds: f.genre_ids,
  ...(order === undefined ? {} : { order }),
});

const MovieRecord = z.object({
  id: z.number(),
  title: z.string(),
  release_date: z.string().nullish(),
  vote_count: z.number().default(0),
  runtime: z.number().nullish(),
  genres: z.array(z.object({ id: z.number() })).default([]),
  keywords: z.object({ keywords: z.array(z.object({ id: z.number() })).default([]) }).default({ keywords: [] }),
  credits: z.object({
    cast: z.array(z.object({ id: z.number(), character: z.string().nullish() })).default([]),
    crew: z.array(z.object({ id: z.number(), job: z.string().nullish() })).default([]),
  }),
});

/** A film's record as the fit check needs it: genres, year, runtime, cast, crew and keywords. */
export async function getFilmRecord(tmdbId: number): Promise<FilmRecord> {
  "use cache";
  cacheLife("days");
  const m = await tmdb(`/movie/${tmdbId}`, MovieRecord, { append_to_response: "credits,keywords", language: "en-US" });
  return {
    tmdbId: m.id,
    title: m.title,
    year: yearOf(m.release_date),
    voteCount: m.vote_count,
    runtime: m.runtime ?? 0,
    genreIds: m.genres.map((g) => g.id),
    keywordIds: m.keywords.keywords.map((k) => k.id),
    cast: m.credits.cast.map((c) => ({ personId: c.id, character: c.character ?? "" })),
    crew: m.credits.crew.map((c) => ({ personId: c.id, job: c.job ?? "" })),
  };
}

/** A film's cast (billing order) and directors, for finding people to ask about. */
export async function getFilmPeople(tmdbId: number): Promise<{ leads: number[]; directors: number[] }> {
  "use cache";
  cacheLife("days");
  const credits = await tmdb(
    `/movie/${tmdbId}/credits`,
    z.object({
      cast: z.array(z.object({ id: z.number(), order: z.number().default(999) })).default([]),
      crew: z.array(z.object({ id: z.number(), job: z.string().nullish() })).default([]),
    }),
  );
  return {
    leads: credits.cast
      .filter((c) => c.order <= RULES.deepCut.board.leadOrder)
      .sort((a, b) => a.order - b.order)
      .map((c) => c.id),
    directors: credits.crew.filter((c) => c.job === "Director").map((c) => c.id),
  };
}

export interface PersonFilms {
  name: string;
  /** Acting roles (not as oneself or archive footage), documentaries and "video" releases left out. */
  acted: Candidate[];
  /** Films directed, documentaries and "video" releases left out. */
  directed: Candidate[];
  /** Every film acting credit, in Casting call's shape, to measure fame its way. */
  castCredits: {
    tmdbId: number;
    voteCount: number;
    order: number;
    genreIds: number[];
    asSelf: boolean;
    asVoice: boolean;
    video: boolean;
    hasReleaseDate: boolean;
  }[];
}

const CreditFilm = ListedFilm.extend({ video: z.boolean().default(false) });

export async function getPersonFilms(personId: number): Promise<PersonFilms> {
  "use cache";
  cacheLife("days");
  const p = await tmdb(
    `/person/${personId}`,
    z.object({
      name: z.string(),
      movie_credits: z.object({
        cast: z.array(CreditFilm.extend({ character: z.string().nullish(), order: z.number().nullish() })).default([]),
        crew: z.array(CreditFilm.extend({ job: z.string().nullish() })).default([]),
      }),
    }),
    { append_to_response: "movie_credits", language: "en-US" },
  );
  const proper = (f: z.infer<typeof CreditFilm>) => !f.video && !f.genre_ids.includes(DOCUMENTARY_GENRE);
  const seen = new Set<number>();
  const once = (c: Candidate) => !seen.has(c.tmdbId) && Boolean(seen.add(c.tmdbId));
  const acted = p.movie_credits.cast
    .filter((c) => proper(c) && isActingCredit(c.character ?? ""))
    .map((c) => toCandidate(c, c.order ?? 999))
    .filter(once);
  seen.clear();
  const directed = p.movie_credits.crew
    .filter((c) => proper(c) && c.job === "Director")
    .map((c) => toCandidate(c))
    .filter(once);
  return {
    name: p.name,
    acted,
    directed,
    castCredits: p.movie_credits.cast.map((c) => ({
      tmdbId: c.id,
      voteCount: c.vote_count,
      order: c.order ?? 999,
      genreIds: c.genre_ids,
      asSelf: isSelfCredit(c.character ?? ""),
      asVoice: /\(voice\)/i.test(c.character ?? ""),
      video: c.video,
      hasReleaseDate: Boolean(c.release_date),
    })),
  };
}

const DiscoverPage = z.object({
  total_results: z.number().default(0),
  total_pages: z.number().default(0),
  results: z.array(ListedFilm),
});

/** One page of TMDB's film discovery, documentaries and shorts left out. */
export async function discoverFilms(
  params: Record<string, string>,
  page = 1,
): Promise<{ total: number; pages: number; films: Candidate[] }> {
  "use cache";
  cacheLife("days");
  const without = [String(DOCUMENTARY_GENRE), params.without_genres].filter(Boolean).join(",");
  const r = await tmdb("/discover/movie", DiscoverPage, {
    include_adult: "false",
    include_video: "false",
    language: "en-US",
    "with_runtime.gte": String(RULES.deepCut.board.minRuntime),
    ...params,
    without_genres: without,
    page: String(page),
  });
  return { total: r.total_results, pages: r.total_pages, films: r.results.map((f) => toCandidate(f)) };
}
