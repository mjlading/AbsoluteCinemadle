"use client";

import { useEffect, useId, useState, type CSSProperties, type KeyboardEvent } from "react";

import { suggestFilmsAndPeople } from "@/lib/soundbytes/api";
import { pickName } from "@/lib/soundbytes/state";
import type { GuessPick } from "@/lib/soundbytes/types";
import { FilmIcon, PersonIcon } from "./icons";

/**
 * One guess box for films and actors. Suggestions come from TMDB, each marked
 * with a film or person icon; only a picked suggestion is a guess, so its
 * kind is never in doubt. The list opens upward, so a phone keyboard never
 * hides it.
 */
export function GuessBox({
  disabled,
  shakeKey,
  onPick,
}: {
  disabled: boolean;
  /** Changes whenever the box should shake (a wrong or repeated guess). */
  shakeKey: number;
  onPick: (pick: GuessPick) => void;
}) {
  const inputId = useId();
  const listId = useId();
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<{ query: string; picks: GuessPick[] } | null>(null);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const query = value.trim();
  // A new shakeKey starts the shake; it is marked seen when the animation ends.
  const [shakenKey, setShakenKey] = useState(shakeKey);
  const shaking = shakeKey !== shakenKey;

  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      suggestFilmsAndPeople(query, controller.signal).then(
        ({ results }) => setSuggestions({ query, picks: results }),
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
  const picks = open && !disabled && query.length >= 2 && fresh ? suggestions.picks : [];

  const pick = (choice: GuessPick) => {
    onPick(choice);
    setValue("");
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      // Typed text alone is never a guess; Enter only takes a highlighted suggestion.
      event.preventDefault();
      if (active >= 0 && picks[active]) pick(picks[active]);
      return;
    }
    if (picks.length === 0) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? picks.length - 1 : i - 1));
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % picks.length);
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className={`relative ${shaking ? "sb-shake" : ""}`} onAnimationEnd={() => setShakenKey(shakeKey)}>
      <label htmlFor={inputId} className="sr-only">
        Guess a film or an actor
      </label>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center gap-0.5 text-ink-soft">
        <FilmIcon className="size-4" style={{ "--sb-icon-hole": "var(--surface)" } as CSSProperties} />
        <PersonIcon className="size-4" />
      </span>
      <input
        id={inputId}
        role="combobox"
        aria-expanded={picks.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 && picks[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="search"
        placeholder="Film or actor"
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
        className="min-h-12 w-full rounded-full border-[1.5px] border-ink/30 bg-surface pl-[3.4rem] pr-4 text-lg focus:border-ink disabled:opacity-50"
      />
      {picks.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Suggestions"
          className="absolute inset-x-0 bottom-full z-20 mb-1.5 max-h-72 overflow-y-auto rounded-xl border border-ink/15 bg-surface py-1 shadow-xl"
        >
          {picks.map((choice, index) => (
            <li
              key={`${choice.kind}-${choice.tmdbId}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              // Keep focus in the input; a mousedown here would blur it and close the list first.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(choice)}
              className={`flex min-h-11 cursor-pointer items-center gap-3 px-3 py-1.5 ${index === active ? "bg-ink/10" : "hover:bg-ink/5"}`}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full ${choice.kind === "film" ? "bg-ink text-table" : "bg-[var(--tier-1)] text-on-tape"}`}
              >
                {choice.kind === "film" ? (
                  <FilmIcon className="size-4" style={{ "--sb-icon-hole": "var(--ink)" } as CSSProperties} />
                ) : (
                  <PersonIcon className="size-4" />
                )}
              </span>
              <span className="min-w-0">
                <span className="sr-only">{choice.kind === "film" ? "Film: " : "Actor: "}</span>
                <span className="font-semibold">{pickName(choice)}</span>
                {choice.kind === "film" && choice.year && <span className="ml-2 text-ink-soft">{choice.year}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
