import { z } from "zod";

/*
 * Thin, uncached TMDB API client. Server-only by nature: it reads the token
 * from the environment. App code should use ./cached.ts; scripts use this directly.
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

export interface ImageInfo {
  path: string;
  width: number;
  height: number;
  /** ISO 639-1 code of text in the image, or null for images without text. */
  language: string | null;
  voteCount: number;
}

const ImageSchema = z
  .object({
    file_path: z.string(),
    width: z.number(),
    height: z.number(),
    iso_639_1: nullableString,
    vote_count: z.number().default(0),
  })
  .transform((i): ImageInfo => ({
    path: i.file_path,
    width: i.width,
    height: i.height,
    language: i.iso_639_1,
    voteCount: i.vote_count,
  }));

export interface CastMember {
  personId: number;
  name: string;
  character: string;
  profilePath: string | null;
  order: number;
}

export interface CrewMember {
  personId: number;
  name: string;
  job: string;
}

export interface MovieDetails extends MovieSummary {
  cast: CastMember[];
  directors: CrewMember[];
  /** Text-free backdrops first, then English ones. */
  backdrops: ImageInfo[];
}

const MovieDetailsSchema = z.object({
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
    crew: z.array(z.object({ id: z.number(), name: z.string(), job: z.string() })),
  }),
  images: z.object({ backdrops: z.array(ImageSchema) }),
});

export async function getMovie(tmdbId: number): Promise<MovieDetails> {
  const m = await tmdb(`/movie/${tmdbId}`, MovieDetailsSchema, {
    append_to_response: "credits,images",
    include_image_language: "null,en",
    language: "en-US",
  });
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
    directors: m.credits.crew
      .filter((c) => c.job === "Director")
      .map((c) => ({ personId: c.id, name: c.name, job: c.job })),
    backdrops: [...m.images.backdrops].sort(
      (a, b) => Number(a.language !== null) - Number(b.language !== null) || b.voteCount - a.voteCount,
    ),
  };
}

/** Every profile photo TMDB has for a person, most voted first, so the admin can match the film's era. */
export async function getPersonProfiles(personId: number): Promise<ImageInfo[]> {
  const { profiles } = await tmdb(`/person/${personId}/images`, z.object({ profiles: z.array(ImageSchema) }));
  return [...profiles].sort((a, b) => b.voteCount - a.voteCount);
}

export interface PersonFilmography {
  acted: MovieSummary[];
  directed: MovieSummary[];
}

const CreditSchema = z.object({
  id: z.number(),
  title: z.string(),
  release_date: z.string().nullish(),
  poster_path: nullableString,
  vote_count: z.number().default(0),
});

export async function getPersonFilmography(personId: number): Promise<PersonFilmography> {
  const credits = await tmdb(
    `/person/${personId}/movie_credits`,
    z.object({ cast: z.array(CreditSchema), crew: z.array(CreditSchema.extend({ job: z.string() })) }),
    { language: "en-US" },
  );
  const toSummary = (c: z.infer<typeof CreditSchema>): MovieSummary => ({
    tmdbId: c.id,
    title: c.title,
    year: yearOf(c.release_date),
    posterPath: c.poster_path,
    voteCount: c.vote_count,
  });
  return {
    acted: credits.cast.map(toSummary),
    directed: credits.crew.filter((c) => c.job === "Director").map(toSummary),
  };
}
