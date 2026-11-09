import { request } from "@/lib/game/api";
import type { CollageDay, CollageGuessResult, CollageSolution, PublicCollagePuzzle } from "./types";

const base = (puzzleId: string) => `/api/collage/${encodeURIComponent(puzzleId)}`;

export const fetchCollageDays = () => request<{ days: CollageDay[] }>("/api/collage");

export const fetchCollageDay = (date: string) =>
  request<PublicCollagePuzzle>(`/api/collage/day/${encodeURIComponent(date)}`);

export const guessCollage = (puzzleId: string, guess: string, tmdbId?: number) =>
  request<CollageGuessResult>(`${base(puzzleId)}/guess`, { method: "POST", body: JSON.stringify({ guess, tmdbId }) });

export const fetchCollageSolution = (puzzleId: string) => request<CollageSolution>(`${base(puzzleId)}/solution`);
