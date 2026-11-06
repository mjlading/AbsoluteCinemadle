import { ApiError } from "@/lib/game/api";
import type { CollageGuessResult, CollageSolution, PublicCollagePuzzle } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(response.status, body?.error ?? `Request failed with ${response.status}.`);
  }
  return (await response.json()) as T;
}

const base = (puzzleId: string) => `/api/collage/${encodeURIComponent(puzzleId)}`;

export const fetchCollageList = () => request<{ puzzles: { id: string; name: string }[] }>("/api/collage");

export const fetchCollage = (puzzleId: string) => request<PublicCollagePuzzle>(base(puzzleId));

export const guessCollage = (puzzleId: string, guess: string, tmdbId?: number) =>
  request<CollageGuessResult>(`${base(puzzleId)}/guess`, { method: "POST", body: JSON.stringify({ guess, tmdbId }) });

export const fetchCollageSolution = (puzzleId: string) => request<CollageSolution>(`${base(puzzleId)}/solution`);
