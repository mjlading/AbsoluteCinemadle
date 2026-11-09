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
  originalTitle: string | null;
  cast: CastMember[];
  directors: CrewMember[];
  /** Text-free backdrops first, then English ones. */
  backdrops: ImageInfo[];
}

const MovieDetailsSchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: nullableString,
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
    originalTitle: m.original_title && m.original_title !== m.title ? m.original_title : null,
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

export interface MovieWithCast extends MovieSummary {
  /** In billing order. */
  cast: CastMember[];
}

const MovieWithCastSchema = MovieDetailsSchema.pick({
  id: true,
  title: true,
  release_date: true,
  poster_path: true,
  vote_count: true,
}).extend({ credits: MovieDetailsSchema.shape.credits.pick({ cast: true }) });

/** A film's summary and cast, without the images and crew getMovie also fetches. */
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

export interface ForeignTitle {
  title: string;
  /** ISO 639-1, or null when TMDB only knows the country. */
  language: string | null;
  /** ISO 3166-1, or null when TMDB only knows the language. */
  country: string | null;
}

/**
 * Release titles from other countries and languages (TMDB translations and
 * alternative titles), without the English title and without duplicates.
 */
export async function getForeignTitles(tmdbId: number): Promise<ForeignTitle[]> {
  const [{ translations }, { titles }, movie] = await Promise.all([
    tmdb(
      `/movie/${tmdbId}/translations`,
      z.object({
        translations: z.array(
          z.object({
            iso_639_1: z.string(),
            iso_3166_1: z.string(),
            data: z.object({ title: z.string().nullish() }),
          }),
        ),
      }),
    ),
    tmdb(
      `/movie/${tmdbId}/alternative_titles`,
      z.object({ titles: z.array(z.object({ iso_3166_1: z.string(), title: z.string() })) }),
    ),
    tmdb(`/movie/${tmdbId}`, z.object({ title: z.string() }), { language: "en-US" }),
  ]);

  const key = (title: string) => title.trim().toLowerCase();
  const english = key(movie.title);
  const seen = new Set<string>();
  const results: ForeignTitle[] = [];
  const add = (candidate: ForeignTitle) => {
    const id = `${key(candidate.title)}|${candidate.country ?? ""}`;
    if (!candidate.title.trim() || key(candidate.title) === english || seen.has(id)) return;
    seen.add(id);
    results.push({ ...candidate, title: candidate.title.trim() });
  };

  for (const t of translations) {
    if (t.iso_639_1 !== "en" && t.data.title)
      add({ title: t.data.title, language: t.iso_639_1, country: t.iso_3166_1 || null });
  }
  for (const t of titles) {
    if (!["US", "GB", "AU", "CA", "IE", "NZ"].includes(t.iso_3166_1)) {
      add({ title: t.title, language: null, country: t.iso_3166_1 || null });
    }
  }
  return results;
}

export interface Review {
  id: string;
  author: string;
  content: string;
  /** 0 to 10, when the reviewer gave one. */
  rating: number | null;
}

/** TMDB user reviews of a film, in English. */
export async function getReviews(tmdbId: number): Promise<Review[]> {
  const { results } = await tmdb(
    `/movie/${tmdbId}/reviews`,
    z.object({
      results: z.array(
        z.object({
          id: z.string(),
          author: z.string(),
          content: z.string(),
          author_details: z.object({ rating: z.number().nullish() }).optional(),
        }),
      ),
    }),
    { language: "en-US" },
  );
  return results.map((r) => ({
    id: r.id,
    author: r.author,
    content: r.content,
    rating: r.author_details?.rating ?? null,
  }));
}

export interface Video {
  /** The YouTube video id. */
  key: string;
  name: string;
  type: string;
  official: boolean;
}

/** A film's YouTube videos on TMDB: official trailers and clips first, the rest after. */
export async function getVideos(tmdbId: number): Promise<Video[]> {
  const { results } = await tmdb(
    `/movie/${tmdbId}/videos`,
    z.object({
      results: z.array(
        z.object({ site: z.string(), key: z.string(), name: z.string(), type: z.string(), official: z.boolean() }),
      ),
    }),
    { language: "en-US" },
  );
  const rank = (v: Video) => (v.official ? 0 : 2) + (["Trailer", "Clip", "Teaser"].includes(v.type) ? 0 : 1);
  return results
    .filter((v) => v.site === "YouTube")
    .map(({ key, name, type, official }) => ({ key, name, type, official }))
    .sort((a, b) => rank(a) - rank(b));
}
