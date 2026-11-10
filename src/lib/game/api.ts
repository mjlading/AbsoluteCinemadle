export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** A JSON request to one of our own API routes; failures throw an ApiError with the server's message. */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
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

export interface FilmSuggestion {
  tmdbId: number;
  title: string;
  year: number | null;
}

export function suggestFilms(query: string, signal: AbortSignal): Promise<{ results: FilmSuggestion[] }> {
  return request(`/api/films/search?q=${encodeURIComponent(query)}`, { signal });
}
