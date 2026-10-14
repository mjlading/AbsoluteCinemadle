import type { GuessResult, PublicPuzzle, SolvedGroup } from "@/lib/puzzle/types";

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

const base = (date: string) => `/api/puzzles/${date}`;

export function fetchPuzzle(date: string): Promise<PublicPuzzle> {
  return request(base(date));
}

export function submitGuess(date: string, tileIds: string[]): Promise<GuessResult> {
  return request(`${base(date)}/guess`, { method: "POST", body: JSON.stringify({ tileIds }) });
}

export function revealLabel(date: string, tileId: string): Promise<{ tileId: string; label: string }> {
  return request(`${base(date)}/labels`, { method: "POST", body: JSON.stringify({ tileId }) });
}

export function fetchSolution(date: string): Promise<{ groups: SolvedGroup[] }> {
  return request(`${base(date)}/solution`);
}
