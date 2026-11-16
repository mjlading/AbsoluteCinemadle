/**
 * The used-films ledger, .data/used-films.json (gitignored, since it names the answers):
 * every film or series a Close-Ups puzzle or Soundbytes board has used, so the labs'
 * pickers (tools/used_films.py) never pick one twice, in either game. Keys are
 * "movie:<tmdb id>" or "tv:<tmdb id>", since TMDB's film and series ids overlap.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type Game = "close-ups" | "soundbytes";

const LEDGER = path.join(import.meta.dirname, "..", ".data", "used-films.json");

export interface UsedTitle {
  mediaType: "movie" | "tv";
  tmdbId: number;
}

export async function recordUsedFilms(game: Game, titles: UsedTitle[]): Promise<void> {
  let ledger: Record<string, string[]> = {};
  try {
    ledger = JSON.parse(await readFile(LEDGER, "utf8"));
  } catch {
    // no ledger yet
  }
  // A bare id, from before keys carried the media type, is a film.
  ledger = Object.fromEntries(Object.entries(ledger).map(([k, games]) => [k.includes(":") ? k : `movie:${k}`, games]));
  for (const { mediaType, tmdbId } of titles) {
    const key = `${mediaType}:${tmdbId}`;
    ledger[key] = [...new Set([...(ledger[key] ?? []), game])].sort();
  }
  const sorted = Object.fromEntries(Object.entries(ledger).sort(([a], [b]) => a.localeCompare(b)));
  await mkdir(path.dirname(LEDGER), { recursive: true });
  await writeFile(LEDGER, JSON.stringify(sorted, null, 1));
}
