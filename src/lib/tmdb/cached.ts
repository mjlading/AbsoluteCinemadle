import "server-only";

import { cacheLife } from "next/cache";

import * as api from "./api";

/*
 * TMDB lookups cached on the server. TMDB allows caching its data for up to
 * 6 months; these lifetimes are far shorter.
 */

export async function searchMovies(query: string) {
  "use cache";
  cacheLife("hours");
  return api.searchMovies(query);
}

export async function getMovie(tmdbId: number) {
  "use cache";
  cacheLife("days");
  return api.getMovie(tmdbId);
}

export async function getPersonProfiles(personId: number) {
  "use cache";
  cacheLife("days");
  return api.getPersonProfiles(personId);
}

export async function getPersonFilmography(personId: number) {
  "use cache";
  cacheLife("days");
  return api.getPersonFilmography(personId);
}

export async function getForeignTitles(tmdbId: number) {
  "use cache";
  cacheLife("days");
  return api.getForeignTitles(tmdbId);
}

export async function getReviews(tmdbId: number) {
  "use cache";
  cacheLife("days");
  return api.getReviews(tmdbId);
}

export async function getVideos(tmdbId: number) {
  "use cache";
  cacheLife("days");
  return api.getVideos(tmdbId);
}
