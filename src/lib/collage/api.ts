import { request } from "@/lib/game/api";
import type { CollageGuessResult, CollageSolution, PublicCollagePuzzle } from "./types";

const base = (puzzleId: string) => `/api/collage/${encodeURIComponent(puzzleId)}`;

export const fetchCollageList = () => request<{ puzzles: { id: string; name: string }[] }>("/api/collage");

export const fetchCollage = (puzzleId: string) => request<PublicCollagePuzzle>(base(puzzleId));

export const guessCollage = (puzzleId: string, guess: string, tmdbId?: number) =>
  request<CollageGuessResult>(`${base(puzzleId)}/guess`, { method: "POST", body: JSON.stringify({ guess, tmdbId }) });

export const fetchCollageSolution = (puzzleId: string) => request<CollageSolution>(`${base(puzzleId)}/solution`);
