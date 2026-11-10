import { request } from "@/lib/game/api";
import type { GuessPick, PublicSoundbytesBoard, SoundbytesAnswer, SoundbytesDay, SoundbytesGuessResult } from "./types";

const base = (boardId: string) => `/api/soundbytes/${encodeURIComponent(boardId)}`;

export const fetchSoundbytesDays = () => request<{ days: SoundbytesDay[] }>("/api/soundbytes");

export const fetchSoundbytesDay = (date: string) =>
  request<PublicSoundbytesBoard>(`/api/soundbytes/day/${encodeURIComponent(date)}`);

export const guessBoard = (boardId: string, pick: GuessPick) =>
  request<SoundbytesGuessResult>(`${base(boardId)}/guess`, {
    method: "POST",
    body: JSON.stringify({ kind: pick.kind, tmdbId: pick.tmdbId }),
  });

export const fetchBoardSolution = (boardId: string) =>
  request<{ answer: SoundbytesAnswer }>(`${base(boardId)}/solution`);

export const suggestFilmsAndPeople = (query: string, signal: AbortSignal) =>
  request<{ results: GuessPick[] }>(`/api/search?q=${encodeURIComponent(query)}`, { signal });
