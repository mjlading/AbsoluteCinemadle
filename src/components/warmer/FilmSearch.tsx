"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";

import { Poster } from "@/components/game/Poster";
import { ReelSpinner } from "@/components/game/ReelSpinner";
import { request } from "@/lib/game/api";
import { heatOf } from "@/lib/warmer/heat";
import type { WarmerFilm } from "@/lib/warmer/types";

/**
 * The guess box: films from the game's own list, with their posters. Enter takes the
 * highlighted film, or the top one. A film already tried shows the rank it got.
 */
export function FilmSearch({
  busy,
  tried,
  onPick,
}: {
  /** A guess is being checked; typing goes on, picking waits. */
  busy: boolean;
  /** The rank of every film tried so far, by film id. */
  tried: Map<number, number>;
  onPick: (film: WarmerFilm) => void;
}) {
  const inputId = useId();
  const listId = useId();
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<{ query: string; films: WarmerFilm[] } | null>(null);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const query = value.trim();

  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      request<{ results: WarmerFilm[] }>(`/api/warmer/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      }).then(
        ({ results }) => setSuggestions({ query, films: results }),
        () => {},
      );
    }, 150);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Results for an earlier, shorter prefix stay up while the refined ones load; anything else is stale.
  const fresh = suggestions && query.toLowerCase().startsWith(suggestions.query.toLowerCase());
  const films = open && query.length >= 2 && fresh ? suggestions.films : [];
  const current = films.length === 0 ? -1 : active >= 0 && active < films.length ? active : 0;

  const pick = (film: WarmerFilm) => {
    if (busy) return;
    onPick(film);
    setValue("");
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const choice = films[current];
      if (choice) pick(choice);
      return;
    }
    if (films.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current + 1) % films.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(current <= 0 ? films.length - 1 : current - 1);
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className="relative">
      <label htmlFor={inputId} className="sr-only">
        Guess a film
      </label>
      <input
        id={inputId}
        role="combobox"
        aria-expanded={films.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={current >= 0 ? `${listId}-${current}` : undefined}
        aria-busy={busy}
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="go"
        placeholder="Guess a film"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="min-h-12 w-full rounded-full border-[1.5px] border-ink/30 bg-surface pl-5 pr-12 text-lg focus:border-ink"
      />
      {busy && <ReelSpinner className="absolute right-4 top-3.5 size-5 text-ink-soft" />}
      {films.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Films"
          className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-[19.5rem] overflow-y-auto rounded-2xl border border-ink/15 bg-surface py-1.5 shadow-xl"
        >
          {films.map((film, index) => {
            const rank = tried.get(film.id);
            return (
              <li
                key={film.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === current}
                // Keep focus in the input; a mousedown here would blur it and close the list first.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(film)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-1.5 ${
                  index === current ? "bg-ink/10" : "hover:bg-ink/5"
                }`}
              >
                <Poster src={film.posterUrl} className="h-[42px] w-[28px]" />
                <span className={`min-w-0 flex-1 leading-tight ${rank ? "text-ink-soft" : ""}`}>
                  <span className="font-semibold">{film.title}</span>
                  {film.year && <span className="text-ink-soft"> {film.year}</span>}
                </span>
                {rank && (
                  <span
                    className="shrink-0 rounded-[3px] px-1.5 py-1 font-condensed text-xs font-extrabold leading-none text-on-tape"
                    style={{ background: heatOf(rank).color }}
                  >
                    <span className="sr-only">already tried, rank </span>#{rank}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
