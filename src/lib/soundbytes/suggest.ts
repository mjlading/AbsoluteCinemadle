import { normalizeTitle, rankSuggestions } from "@/lib/game/match";
import type { GuessPick } from "./types";

const MAX_FILMS = 6;
const MAX_PEOPLE = 4;
const MAX_TOTAL = 8;

/** How well a name matches what was typed: 0 starts with it, 1 has a word that does, 2 anything else. */
function matchRank(typed: string, name: string): number {
  const query = normalizeTitle(typed);
  const normalized = normalizeTitle(name);
  if (normalized.startsWith(query)) return 0;
  if (` ${normalized}`.includes(` ${query}`)) return 1;
  return 2;
}

/**
 * One list of films and actors for the guess box. Each side keeps its own
 * ranking (films by votes, people by TMDB's popularity); the two are then
 * merged by how well they match the typed text, alternating within a rank.
 */
export function mergeSuggestions(
  typed: string,
  films: readonly { tmdbId: number; title: string; year: number | null; voteCount: number }[],
  people: readonly { tmdbId: number; name: string; department: string | null }[],
): GuessPick[] {
  const filmPicks = rankSuggestions(typed, films)
    .slice(0, MAX_FILMS)
    .map((f, index) => ({
      rank: matchRank(typed, f.title),
      index,
      pick: { kind: "film", tmdbId: f.tmdbId, title: f.title, year: f.year } satisfies GuessPick,
    }));
  const personPicks = people
    .filter((p) => p.department === "Acting")
    .map((p) => ({ rank: matchRank(typed, p.name), p }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, MAX_PEOPLE)
    .map(({ rank, p }, index) => ({
      rank,
      index,
      pick: { kind: "person", tmdbId: p.tmdbId, name: p.name } satisfies GuessPick,
    }));
  return [...filmPicks, ...personPicks]
    .sort((a, b) => a.rank - b.rank || a.index - b.index || (a.pick.kind === "film" ? -1 : 1))
    .slice(0, MAX_TOTAL)
    .map(({ pick }) => pick);
}
