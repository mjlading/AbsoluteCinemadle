import { z } from "zod";

/*
 * Thin, uncached TMDB API client. Server-only by nature: it reads the token
 * from the environment. App code uses it through ./cached.ts.
 */

const API_BASE = "https://api.themoviedb.org/3";

export class TmdbError extends Error {}

async function tmdb<T extends z.ZodType>(
  path: string,
  schema: T,
  params: Record<string, string> = {},
): Promise<z.infer<T>> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) throw new TmdbError("TMDB_READ_ACCESS_TOKEN is not set. See .env.example.");

  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  if (!response.ok) throw new TmdbError(`TMDB ${path} answered ${response.status}`);
  return schema.parse(await response.json());
}

const yearOf = (releaseDate: string | null | undefined) => {
  const year = Number(releaseDate?.slice(0, 4));
  return Number.isInteger(year) && year > 1800 ? year : null;
};

const nullableString = z
  .string()
  .nullish()
  .transform((v) => v || null);

export interface MovieSummary {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  voteCount: number;
}

const MovieSummarySchema = z
  .object({
    id: z.number(),
    title: z.string(),
    release_date: z.string().nullish(),
    poster_path: nullableString,
    vote_count: z.number().default(0),
  })
  .transform((m): MovieSummary => ({
    tmdbId: m.id,
    title: m.title,
    year: yearOf(m.release_date),
    posterPath: m.poster_path,
    voteCount: m.vote_count,
  }));

export async function searchMovies(query: string): Promise<MovieSummary[]> {
  const { results } = await tmdb("/search/movie", z.object({ results: z.array(MovieSummarySchema) }), {
    query,
    include_adult: "false",
    language: "en-US",
  });
  return results;
}

export interface PersonSummary {
  tmdbId: number;
  name: string;
  /** TMDB's main department for the person, e.g. "Acting" or "Directing". */
  department: string | null;
}

const PersonSummarySchema = z
  .object({ id: z.number(), name: z.string(), known_for_department: nullableString })
  .transform((p): PersonSummary => ({ tmdbId: p.id, name: p.name, department: p.known_for_department }));

/** People matching a name, most popular first, as TMDB ranks them. */
export async function searchPeople(query: string): Promise<PersonSummary[]> {
  const { results } = await tmdb("/search/person", z.object({ results: z.array(PersonSummarySchema) }), {
    query,
    include_adult: "false",
    language: "en-US",
  });
  return results;
}

export interface CastMember {
  personId: number;
  name: string;
  character: string;
  profilePath: string | null;
  order: number;
}

export interface MovieWithCast extends MovieSummary {
  /** In billing order. */
  cast: CastMember[];
}

const MovieWithCastSchema = z.object({
  id: z.number(),
  title: z.string(),
  release_date: z.string().nullish(),
  poster_path: nullableString,
  vote_count: z.number().default(0),
  credits: z.object({
    cast: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        character: z.string().nullish(),
        profile_path: nullableString,
        order: z.number().default(999),
      }),
    ),
  }),
});

/** A film's summary and its cast. */
export async function getMovieWithCast(tmdbId: number): Promise<MovieWithCast> {
  const m = await tmdb(`/movie/${tmdbId}`, MovieWithCastSchema, { append_to_response: "credits", language: "en-US" });
  return {
    tmdbId: m.id,
    title: m.title,
    year: yearOf(m.release_date),
    posterPath: m.poster_path,
    voteCount: m.vote_count,
    cast: m.credits.cast
      .map((c) => ({
        personId: c.id,
        name: c.name,
        character: c.character ?? "",
        profilePath: c.profile_path,
        order: c.order,
      }))
      .sort((a, b) => a.order - b.order),
  };
}

export interface Person {
  tmdbId: number;
  name: string;
  profilePath: string | null;
}

/** A person's name and main profile photo. */
export async function getPerson(personId: number): Promise<Person> {
  const p = await tmdb(
    `/person/${personId}`,
    z.object({ id: z.number(), name: z.string(), profile_path: nullableString }),
    { language: "en-US" },
  );
  return { tmdbId: p.id, name: p.name, profilePath: p.profile_path };
}
