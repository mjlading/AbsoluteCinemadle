import "server-only";

import { cacheLife } from "next/cache";

import type { HowOldSource } from "./generate";
import * as api from "./tmdb";

/*
 * The board generator's TMDB lookups, cached on the server. TMDB allows
 * caching its data for up to 6 months; these lifetimes are far shorter.
 */

async function decadeFilms(from: number, count: number) {
  "use cache";
  cacheLife("days");
  return api.decadeFilms(from, count);
}

async function votesAtRank(rank: number) {
  "use cache";
  cacheLife("days");
  return api.votesAtRank(rank);
}

async function filmLeads(tmdbId: number) {
  "use cache";
  cacheLife("days");
  return api.filmLeads(tmdbId);
}

async function person(personId: number) {
  "use cache";
  cacheLife("days");
  return api.person(personId);
}

export const cachedSource: HowOldSource = { decadeFilms, votesAtRank, filmLeads, person };
