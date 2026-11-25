import "server-only";

import { z } from "zod";

import { tmdb } from "@/lib/tmdb/api";

/*
 * The TMDB TV calls Ratings Cliff needs: the site's first game about series,
 * so these live here rather than in src/lib/tmdb.
 */

export interface PoolSeries {
  seriesId: number;
  title: string;
  voteCount: number;
  language: string;
  genreIds: number[];
}

const DiscoverSchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      vote_count: z.number().default(0),
      original_language: z.string().default(""),
      genre_ids: z.array(z.number()).default([]),
      first_air_date: z.string().nullish(),
    }),
  ),
});

/** One page (20 series) of the series with the most TMDB votes, the given genres left out. */
export async function getMostVotedSeries(page: number, withoutGenres: readonly number[]): Promise<PoolSeries[]> {
  const { results } = await tmdb("/discover/tv", DiscoverSchema, {
    sort_by: "vote_count.desc",
    include_adult: "false",
    without_genres: withoutGenres.join("|"),
    language: "en-US",
    page: String(page),
  });
  return results.map((r) => ({
    seriesId: r.id,
    title: r.name,
    voteCount: r.vote_count,
    language: r.original_language,
    genreIds: r.genre_ids,
  }));
}

export interface SeriesDetails {
  seriesId: number;
  title: string;
  /** TMDB's kind of show: "Scripted", "Miniseries", "Reality", "Talk Show", ... */
  type: string;
  genreIds: number[];
  posterPath: string | null;
  firstAirDate: string | null;
  lastAirDate: string | null;
  /** Regular seasons (specials left out), with their episode counts and first air dates. */
  seasons: { number: number; episodeCount: number; airDate: string | null }[];
}

const DetailsSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string().nullish(),
  poster_path: z.string().nullish(),
  genres: z.array(z.object({ id: z.number() })).default([]),
  first_air_date: z.string().nullish(),
  last_air_date: z.string().nullish(),
  seasons: z
    .array(
      z.object({ season_number: z.number(), episode_count: z.number().default(0), air_date: z.string().nullish() }),
    )
    .default([]),
});

export async function getSeriesDetails(seriesId: number): Promise<SeriesDetails> {
  const d = await tmdb(`/tv/${seriesId}`, DetailsSchema, { language: "en-US" });
  return {
    seriesId: d.id,
    title: d.name,
    type: d.type ?? "",
    genreIds: d.genres.map((g) => g.id),
    posterPath: d.poster_path || null,
    firstAirDate: d.first_air_date || null,
    lastAirDate: d.last_air_date || null,
    seasons: d.seasons
      .filter((s) => s.season_number > 0)
      .map((s) => ({ number: s.season_number, episodeCount: s.episode_count, airDate: s.air_date || null })),
  };
}

export interface SeasonEpisode {
  episode: number;
  airDate: string | null;
  voteAverage: number;
  voteCount: number;
}

const SeasonSchema = z.object({
  episodes: z
    .array(
      z.object({
        episode_number: z.number(),
        air_date: z.string().nullish(),
        vote_average: z.number().default(0),
        vote_count: z.number().default(0),
      }),
    )
    .default([]),
});

/** A season's episodes in order, with their TMDB ratings. */
export async function getSeasonEpisodes(seriesId: number, season: number): Promise<SeasonEpisode[]> {
  const { episodes } = await tmdb(`/tv/${seriesId}/season/${season}`, SeasonSchema, { language: "en-US" });
  return episodes
    .map((e) => ({
      episode: e.episode_number,
      airDate: e.air_date || null,
      voteAverage: e.vote_average,
      voteCount: e.vote_count,
    }))
    .sort((a, b) => a.episode - b.episode);
}
