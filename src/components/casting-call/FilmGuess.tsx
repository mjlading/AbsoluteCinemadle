"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";

import { suggestFilms, type FilmSuggestion } from "@/lib/game/api";

/**
 * The film search box. Suggestions come from the shared TMDB title search;
 * Enter takes the highlighted suggestion, or the top one when none is
 * highlighted, since the clock is running.
 */
export function FilmGuess({
  disabled,
  busy,
  shakeKey,
  onPick,
  label = "Add a film",
  placeholder = "Type a film that shares an actor",
  autoFocus = false,
}: {
  /** The game is over. */
  disabled: boolean;
  /** A check is in flight; typing goes on, picking waits. */
  busy: boolean;
  /** Changes whenever the box should shake (a film that doesn't connect). */
  shakeKey: number;
  onPick: (film: FilmSuggestion) => void;
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const inputId = useId();
  const listId = useId();
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<{ query: string; films: FilmSuggestion[] } | null>(null);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const query = value.trim();
  const [shakenKey, setShakenKey] = useState(shakeKey);
  const shaking = shakeKey !== shakenKey;

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

  // Results for an earlier, shorter prefix stay up while the refined ones load; anything else is stale.
  const fresh = suggestions && query.toLowerCase().startsWith(suggestions.query.toLowerCase());
  const films = open && !disabled && query.length >= 2 && fresh ? suggestions.films : [];

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
      const choice = films[active >= 0 ? active : 0];
      if (choice) pick(choice);
      return;
    }
    if (films.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % films.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? films.length - 1 : i - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className={`relative ${shaking ? "cc-shake" : ""}`} onAnimationEnd={() => setShakenKey(shakeKey)}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={films.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 && films[active] ? `${listId}-${active}` : undefined}
        aria-busy={busy}
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="go"
        placeholder={disabled ? "Game over" : placeholder}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={`min-h-12 w-full rounded-full border-[1.5px] bg-surface px-5 text-lg focus:border-ink disabled:opacity-50 ${
          shaking ? "border-marker" : "border-ink/30"
        }`}
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
              aria-selected={index === active}
              // Keep focus in the input; a mousedown here would blur it and close the list first.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(film)}
              className={`flex min-h-11 cursor-pointer items-baseline gap-2 px-4 py-2 ${
                index === active || (active < 0 && index === 0) ? "bg-ink/10" : "hover:bg-ink/5"
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
