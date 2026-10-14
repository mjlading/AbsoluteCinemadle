"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";

import type { MovieSummary } from "@/lib/tmdb/api";
import { tmdbImageUrl } from "@/lib/tmdb/images";

/** A TMDB title search; calls `onPick` with the chosen film. */
export function FilmPicker({
  onPick,
  disabled = false,
  label = "Find a film",
}: {
  onPick: (film: MovieSummary) => void;
  disabled?: boolean;
  label?: string;
}) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ query: string; films: MovieSummary[] } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/tmdb/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as { results?: MovieSummary[]; error?: string };
        if (!response.ok) throw new Error(body.error ?? "Search failed.");
        setResults({ query: trimmed, films: body.results ?? [] });
        setSearchError(null);
      } catch (reason) {
        if (!controller.signal.aborted) setSearchError((reason as Error).message);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const films = trimmed.length >= 2 && results ? results.films : [];

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Title"
        autoComplete="off"
        className="min-h-10 rounded-lg border-[1.5px] border-ink/30 bg-surface px-3 focus:border-ink"
      />
      {searchError && (
        <p role="alert" className="text-sm text-marker">
          {searchError}
        </p>
      )}
      {films.length > 0 && (
        <ul
          aria-label="Search results"
          className="flex max-h-80 flex-col overflow-y-auto rounded-lg border border-ink/10"
        >
          {films.map((film) => (
            <li key={film.tmdbId}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(film)}
                className="flex w-full items-center gap-3 px-2 py-1.5 text-left hover:bg-ink/5 disabled:opacity-50"
              >
                <span className="relative h-12 w-8 shrink-0 overflow-hidden rounded-[2px] bg-ink/10">
                  {film.posterPath && (
                    <Image
                      src={tmdbImageUrl(film.posterPath, "w92")}
                      alt=""
                      fill
                      unoptimized
                      sizes="2rem"
                      className="object-cover"
                    />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{film.title}</span>
                  <span className="text-sm text-ink-soft">{film.year ?? "Year unknown"}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {trimmed.length >= 2 && results?.query === trimmed && films.length === 0 && !searchError && (
        <p className="text-sm text-ink-soft">No films match that title.</p>
      )}
    </div>
  );
}
