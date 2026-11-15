"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";

import { suggestFilms, type FilmSuggestion } from "@/lib/game/api";

/**
 * The film box: suggestions from the shared title search, as in Casting call's
 * FilmGuess. Enter takes the highlighted suggestion, or the top one.
 */
export function FilmSearch({
  busy,
  onPick,
  label,
}: {
  /** A check is in flight; typing goes on, picking waits. */
  busy: boolean;
  onPick: (film: FilmSuggestion) => void;
  label: string;
}) {
  const inputId = useId();
  const listId = useId();
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<{ query: string; films: FilmSuggestion[] } | null>(null);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const query = value.trim();

  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      suggestFilms(query, controller.signal).then(
        ({ results }) => setSuggestions({ query, films: results }),
        () => {},
      );
    }, 160);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const fresh = suggestions && query.toLowerCase().startsWith(suggestions.query.toLowerCase());
  const films = open && query.length >= 2 && fresh ? suggestions.films : [];
  const current = films.length === 0 ? -1 : active >= 0 && active < films.length ? active : 0;

  const pick = (film: FilmSuggestion) => {
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
        {label}
      </label>
      <input
        id={inputId}
        autoFocus
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
        placeholder="Type a film title"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="min-h-12 w-full rounded-full border-[1.5px] border-ink/30 bg-surface px-5 text-lg focus:border-ink"
      />
      {films.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Suggestions"
          className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-ink/15 bg-surface py-1 shadow-xl"
        >
          {films.map((film, index) => (
            <li
              key={film.tmdbId}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === current}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(film)}
              className={`flex min-h-11 cursor-pointer items-baseline gap-2 px-4 py-2 ${
                index === current ? "bg-ink/10" : "hover:bg-ink/5"
              }`}
            >
              <span className="font-semibold">{film.title}</span>
              {film.year && <span className="text-ink-soft">{film.year}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
