import "server-only";

import { z } from "zod";

import { tmdb } from "@/lib/tmdb/api";
import type { FilmCredit, HowOldSource, PersonDetails } from "./generate";

/*
 * The TMDB lookups How Old Were They? builds its boards from, uncached.
 * ./source.ts caches them for the app.
 */

const PAGE = 20;
const Discover = z.object({ results: z.array(z.object({ id: z.number(), vote_count: z.number().default(0) })) });

const discoverPage = (page: number, params: Record<string, string> = {}) =>
  tmdb("/discover/movie", Discover, {
    sort_by: "vote_count.desc",
    include_adult: "false",
    without_genres: "16,99",
    language: "en-US",
    page: String(page),
    ...params,
  });

export async function decadeFilms(from: number, count: number): Promise<number[]> {
  const params = { "primary_release_date.gte": `${from}-01-01`, "primary_release_date.lte": `${from + 9}-12-31` };
  const pages = await Promise.all(
    Array.from({ length: Math.ceil(count / PAGE) }, (_, i) => discoverPage(i + 1, params)),
  );
  return pages.flatMap((p) => p.results.map((r) => r.id)).slice(0, count);
}

export async function votesAtRank(rank: number): Promise<number> {
  const { results } = await discoverPage(Math.ceil(rank / PAGE));
  const film = results[(rank - 1) % PAGE] ?? results.at(-1);
  if (!film) throw new Error(`TMDB has no film ranked ${rank} by votes.`);
  return film.vote_count;
}

export async function filmLeads(tmdbId: number): Promise<{ personId: number; order: number }[]> {
  const { cast } = await tmdb(
    `/movie/${tmdbId}/credits`,
    z.object({ cast: z.array(z.object({ id: z.number(), order: z.number().default(999) })) }),
    { language: "en-US" },
  );
  return cast.map((c) => ({ personId: c.id, order: c.order })).sort((a, b) => a.order - b.order);
}

const PersonSchema = z.object({
  id: z.number(),
  name: z.string(),
  birthday: z.string().nullish(),
  deathday: z.string().nullish(),
  movie_credits: z.object({
    cast: z.array(
      z.object({
        id: z.number(),
        title: z.string().default(""),
        release_date: z.string().nullish(),
        poster_path: z.string().nullish(),
        vote_count: z.number().default(0),
        order: z.number().nullish(),
        genre_ids: z.array(z.number()).default([]),
        character: z.string().nullish(),
        video: z.boolean().default(false),
      }),
    ),
  }),
});

export async function person(personId: number): Promise<PersonDetails> {
  const p = await tmdb(`/person/${personId}`, PersonSchema, {
    append_to_response: "movie_credits",
    language: "en-US",
  });
  return {
    personId: p.id,
    name: p.name,
    birthday: p.birthday ?? null,
    deathday: p.deathday ?? null,
    films: p.movie_credits.cast.map((c): FilmCredit => ({
      tmdbId: c.id,
      title: c.title,
      releaseDate: c.release_date || null,
      posterPath: c.poster_path || null,
      voteCount: c.vote_count,
      order: c.order ?? 999,
      genreIds: c.genre_ids,
      character: c.character ?? "",
      video: c.video,
    })),
  };
}

export const uncachedSource: HowOldSource = { decadeFilms, votesAtRank, filmLeads, person };
