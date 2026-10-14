import type {
  BonusResult,
  GuessResult,
  PublicBonus,
  PublicPuzzle,
  SolvedGroup,
  WarmupAnswer,
  WarmupGuessResult,
} from "@/lib/puzzle/types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

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

/** Where today's game lives; an admin preview uses `/api/admin/puzzles/<id>` instead. */
export const puzzleApiBase = (date: string) => `/api/puzzles/${date}`;

export function fetchPuzzle(base: string): Promise<PublicPuzzle> {
  return request(base);
}

export function submitGuess(base: string, tileIds: string[]): Promise<GuessResult> {
  return request(`${base}/guess`, { method: "POST", body: JSON.stringify({ tileIds }) });
}

export function revealLabel(base: string, tileId: string): Promise<{ tileId: string; label: string }> {
  return request(`${base}/labels`, { method: "POST", body: JSON.stringify({ tileId }) });
}

export function fetchSolution(base: string): Promise<{ groups: SolvedGroup[] }> {
  return request(`${base}/solution`);
}

export function guessWarmup(base: string, cardId: string, guess: string, tmdbId?: number): Promise<WarmupGuessResult> {
  return request(`${base}/warmup/guess`, { method: "POST", body: JSON.stringify({ cardId, guess, tmdbId }) });
}

export function fetchWarmupSolution(base: string): Promise<{ answers: WarmupAnswer[] }> {
  return request(`${base}/warmup/solution`);
}

export interface FilmSuggestion {
  tmdbId: number;
  title: string;
  year: number | null;
}

export function suggestFilms(query: string, signal: AbortSignal): Promise<{ results: FilmSuggestion[] }> {
  return request(`/api/films/search?q=${encodeURIComponent(query)}`, { signal });
}

export function fetchBonus(base: string): Promise<PublicBonus> {
  return request(`${base}/bonus`);
}

export function checkBonus(base: string, matches: Record<string, number>): Promise<{ results: BonusResult[] }> {
  return request(`${base}/bonus/check`, { method: "POST", body: JSON.stringify({ matches }) });
}
