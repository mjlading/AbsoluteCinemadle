import { request } from "@/lib/game/api";
import { readJson, writeJson } from "@/lib/game/storage";
import type { AllTimeBoards, DailyEntry, LeaderboardGame } from "./types";

/*
 * The browser's side of the leaderboard. With no accounts, a name belongs to
 * the random token this browser made the first time it posted; the player can
 * copy it to another device to post under the same name there.
 */

const TOKEN_KEY = "leaderboard:token";
const NAME_KEY = "leaderboard:name";
const postedKey = (game: LeaderboardGame, date: string) => `leaderboard:posted:${game}:${date}`;

export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22,64}$/;

/** This browser's token, made on first use. */
export function leaderboardToken(): string {
  const stored = readJson<string>(TOKEN_KEY);
  if (stored && TOKEN_PATTERN.test(stored)) return stored;
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  writeJson(TOKEN_KEY, token);
  return token;
}

/** Takes over a token copied from another device; false when it doesn't look like one. */
export function adoptLeaderboardCode(code: string): boolean {
  const token = code.trim();
  if (!TOKEN_PATTERN.test(token)) return false;
  writeJson(TOKEN_KEY, token);
  return true;
}

export const savedName = () => readJson<string>(NAME_KEY) ?? "";
export const hasPosted = (game: LeaderboardGame, date: string) => readJson<boolean>(postedKey(game, date)) === true;

/** What the server needs to replay a game: the moves, never a score. */
export type LeaderboardMoves =
  | { game: "close-ups"; guesses: ({ text: string; tmdbId?: number } | null)[] }
  | { game: "casting-call"; films: number[]; timedOut: boolean }
  | { game: "ratings-cliff"; picks: string[] };

export async function postResult(boardId: string, date: string, name: string, moves: LeaderboardMoves) {
  const result = await request<{ name: string; score: number; summary: string }>("/api/leaderboard", {
    method: "POST",
    body: JSON.stringify({ boardId, name, token: leaderboardToken(), moves }),
  });
  writeJson(NAME_KEY, result.name);
  writeJson(postedKey(moves.game, date), true);
  return result;
}

export async function fetchDaily(game: LeaderboardGame, date: string): Promise<DailyEntry[]> {
  const token = readJson<string>(TOKEN_KEY);
  const response = await fetch(`/api/leaderboard/day/${game}/${encodeURIComponent(date)}`, {
    headers: token ? { "x-leaderboard-token": token } : undefined,
  });
  if (!response.ok) throw new Error(`Leaderboard request failed with ${response.status}.`);
  return ((await response.json()) as { entries: DailyEntry[] }).entries;
}

export const fetchAllTime = () => request<AllTimeBoards>("/api/leaderboard/all-time");
