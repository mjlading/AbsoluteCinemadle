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

export async function searchPeople(query: string) {
  "use cache";
  cacheLife("hours");
  return api.searchPeople(query);
}

export async function getMovieWithCast(tmdbId: number) {
  "use cache";
  cacheLife("days");
  return api.getMovieWithCast(tmdbId);
}

export async function getPerson(personId: number) {
  "use cache";
  cacheLife("days");
  return api.getPerson(personId);
}

export async function getPersonFilmCredits(personId: number) {
  "use cache";
  cacheLife("days");
  return api.getPersonFilmCredits(personId);
}

export async function getMostVotedFilms(page: number) {
  "use cache";
  cacheLife("days");
  return api.getMostVotedFilms(page);
}
