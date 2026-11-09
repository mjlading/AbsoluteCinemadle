"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { suggestFilms, type FilmSuggestion } from "@/lib/game/api";

interface TitleGuessProps {
  disabled: boolean;
  /**
   * With `clearOnGuess`, a promise holds the box's text until it settles, and
   * `false` (returned or resolved) keeps it, for a guess that was turned away.
   */
  onGuess: (guess: string, tmdbId?: number) => void | boolean | Promise<void | boolean>;
  /** Shows a "Skip for now" button; the warm-up uses it, the keyword collage does not. */
  onSkip?: () => void;
  /** False when this is the only card left, so skipping would change nothing. */
  canSkip?: boolean;
  /** Also the box's accessible name. */
  placeholder?: string;
  /** Focus the box on mount; off where the box is below the fold, so phones don't jump to it. */
  autoFocus?: boolean;
  /** Empty the box after each guess, for games where guesses stay on one question. */
  clearOnGuess?: boolean;
  /** Where the suggestions open: below the box, or above it when the box sits low on the screen. */
  listPlacement?: "below" | "above";
  /** While the box is empty, the button beside it does this instead (Close-Ups' Skip); Enter in an empty box does nothing. */
  emptyAction?: { label: string; onPress: () => void };
}

/**
 * The guess box: free text, with TMDB title suggestions as a combobox.
 * Picking a suggestion submits it straight away, since the clock is running.
 */
export function TitleGuess({
  disabled,
  onGuess,
  onSkip,
  canSkip = true,
  placeholder = "Which film is this?",
  autoFocus = true,
  clearOnGuess = false,
  listPlacement = "below",
  emptyAction,
}: TitleGuessProps) {
  const inputId = useId();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<{ query: string; films: FilmSuggestion[] } | null>(null);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const query = value.trim();

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      suggestFilms(query, controller.signal).then(
        ({ results }) => setSuggestions({ query, films: results }),
        () => {},
      );
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Results for an earlier, shorter prefix stay up while the refined ones load; anything else is stale.
  const fresh = suggestions && query.toLowerCase().startsWith(suggestions.query.toLowerCase());
  const films = open && query.length >= 2 && fresh ? suggestions.films : [];

  const submit = (guess: string, tmdbId?: number) => {
    if (!guess.trim() || disabled) return;
    const result = onGuess(guess, tmdbId);
    if (clearOnGuess) {
      // Only the text that was guessed goes; anything typed since stays.
      const clear = (outcome: void | boolean) => outcome !== false && setValue((v) => (v === guess ? "" : v));
      if (result instanceof Promise) void result.then(clear, () => {});
      else clear(result);
    }
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      const film = films[active];
      setValue(film.title);
      submit(film.title, film.tmdbId);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(value);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label htmlFor={inputId} className="sr-only">
        {placeholder}
      </label>
      {/* Guess sits beside the box, so the suggestion list never covers it. */}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            id={inputId}
            role="combobox"
            aria-expanded={films.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            placeholder={placeholder}
            value={value}
            disabled={disabled}
            onChange={(event) => {
              setValue(event.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setOpen(false)}
            className="min-h-12 w-full rounded-lg border-[1.5px] border-ink/30 bg-surface px-3 text-lg focus:border-ink disabled:opacity-60"
          />
          {films.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              aria-label="Suggestions"
              className={`absolute inset-x-0 z-20 max-h-64 overflow-y-auto rounded-lg border border-ink/15 bg-surface py-1 shadow-xl ${
                listPlacement === "above" ? "bottom-full mb-2" : "top-full mt-1"
              }`}
            >
              {films.map((film, index) => (
                <li
                  key={film.tmdbId}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // Keep focus in the input; a mousedown here would blur it and close the list first.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setValue(film.title);
                    submit(film.title, film.tmdbId);
                  }}
                  className={`cursor-pointer px-3 py-2 ${index === active ? "bg-ink/10" : "hover:bg-ink/5"}`}
                >
                  <span className="font-semibold">{film.title}</span>
                  {film.year && <span className="ml-2 text-ink-soft">{film.year}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        {emptyAction && !query ? (
          <button
            type="button"
            onClick={emptyAction.onPress}
            disabled={disabled}
            className="min-h-12 min-w-[6.5rem] shrink-0 rounded-full bg-ink/9 px-6 font-semibold text-ink transition-colors hover:bg-ink/15 disabled:opacity-35"
          >
            {emptyAction.label}
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || !query}
            className={`min-h-12 shrink-0 rounded-full bg-ink px-6 font-semibold text-table disabled:opacity-35 ${
              emptyAction ? "min-w-[6.5rem]" : ""
            }`}
          >
            Guess
          </button>
        )}
      </div>
      {onSkip && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            onSkip();
          }}
          disabled={disabled || !canSkip}
          className="min-h-11 self-center rounded-full border-[1.5px] border-ink px-6 font-semibold disabled:opacity-35"
        >
          Skip for now
        </button>
      )}
    </form>
  );
}
