"use client";

import Image from "next/image";
import { useEffect, useId, useState, useTransition } from "react";

import {
  addWarmupEntry,
  removeWarmupEntry,
  suggestBackTranslations,
  updateWarmupTranslation,
} from "@/app/admin/actions";
import type { MovieSummary } from "@/lib/tmdb/api";
import { tmdbImageUrl } from "@/lib/tmdb/images";
import { countryName, languageName } from "@/lib/warmup/names";
import { ConfirmButton } from "./ConfirmButton";
import { FilmPicker } from "./FilmPicker";
import { useAdminAction } from "./use-admin-action";

export interface EditorWarmupEntry {
  id: string;
  position: number;
  foreignTitle: string;
  language: string;
  country: string | null;
  literalTranslation: string;
  film: { title: string; year: number | null; posterPath: string | null };
}

const inputClass = "min-h-10 rounded-lg border-[1.5px] border-ink/30 bg-surface px-3 focus:border-ink";

/** A placed warm-up card: answer, foreign title and an editable literal translation. */
export function WarmupEntryCard({ puzzleId, entry }: { puzzleId: string; entry: EditorWarmupEntry }) {
  const inputId = useId();
  const [draft, setDraft] = useState(entry.literalTranslation);
  const { pending, error, run } = useAdminAction();

  const save = () => {
    const next = draft.trim();
    if (!next) setDraft(entry.literalTranslation);
    else if (next !== entry.literalTranslation) run(() => updateWarmupTranslation(puzzleId, entry.id, next));
  };

  return (
    <li className="flex gap-3 rounded-lg border border-ink/10 p-3">
      <span className="relative h-24 w-16 shrink-0 overflow-hidden rounded-[2px] bg-ink/10">
        {entry.film.posterPath && (
          <Image
            src={tmdbImageUrl(entry.film.posterPath, "w92")}
            alt=""
            fill
            unoptimized
            sizes="4rem"
            className="object-cover"
          />
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm text-ink-soft">
          Card {entry.position}: {entry.film.title}
          {entry.film.year && ` (${entry.film.year})`}
        </p>
        <p lang={entry.language} className="font-display text-2xl font-[850] leading-none">
          {entry.foreignTitle}
        </p>
        <p className="text-sm text-ink-soft">
          {languageName(entry.language)}
          {entry.country && `, ${countryName(entry.country)}`}
        </p>
        <label htmlFor={inputId} className="mt-1 text-sm font-semibold">
          Literal translation
        </label>
        <input
          id={inputId}
          value={draft}
          disabled={pending}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") setDraft(entry.literalTranslation);
          }}
          className={inputClass}
        />
        {error && (
          <p role="alert" className="text-sm text-marker">
            {error}
          </p>
        )}
      </div>
      <ConfirmButton
        disabled={pending}
        onConfirm={() => run(() => removeWarmupEntry(puzzleId, entry.id))}
        confirmLabel="Click again to remove"
        className="self-start text-sm underline-offset-2 hover:underline"
      >
        Remove
      </ConfirmButton>
    </li>
  );
}

interface TitleOption {
  title: string;
  language: string | null;
  country: string | null;
  languageName: string | null;
  countryName: string | null;
}

/**
 * Builds the next warm-up card: pick a film, pick one of its foreign titles
 * from TMDB (or type one), then write the literal translation, optionally from
 * LLM suggestions.
 */
export function AddWarmupEntry({ puzzleId, nextPosition }: { puzzleId: string; nextPosition: number }) {
  const [film, setFilm] = useState<MovieSummary | null>(null);
  return film ? (
    <WarmupCardForm key={film.tmdbId} puzzleId={puzzleId} film={film} onCancel={() => setFilm(null)} />
  ) : (
    <FilmPicker label={`Film for warm-up card ${nextPosition}`} onPick={setFilm} />
  );
}

function WarmupCardForm({ puzzleId, film, onCancel }: { puzzleId: string; film: MovieSummary; onCancel: () => void }) {
  const ids = { title: useId(), language: useId(), country: useId(), literal: useId() };
  const [options, setOptions] = useState<TitleOption[] | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [foreignTitle, setForeignTitle] = useState("");
  const [language, setLanguage] = useState("");
  const [country, setCountry] = useState("");
  const [literal, setLiteral] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggesting, startSuggesting] = useTransition();
  const { pending, error, run } = useAdminAction();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/tmdb/movies/${film.tmdbId}/foreign-titles`)
      .then(async (response) => {
        const body = (await response.json()) as { titles?: TitleOption[]; error?: string };
        if (!response.ok) throw new Error(body.error ?? "Could not load foreign titles.");
        if (!cancelled) setOptions(body.titles ?? []);
      })
      .catch((reason: Error) => !cancelled && setOptionsError(reason.message));
    return () => {
      cancelled = true;
    };
  }, [film.tmdbId]);

  const languageOk = /^[a-z]{2,3}$/i.test(language.trim());
  const countryOk = country.trim() === "" || /^[a-z]{2}$/i.test(country.trim());
  const canSuggest = foreignTitle.trim() !== "" && languageOk && countryOk && !suggesting;
  const canAdd = canSuggest && literal.trim() !== "" && !pending;

  const choose = (option: TitleOption) => {
    setForeignTitle(option.title);
    setLanguage(option.language ?? "");
    setCountry(option.country ?? "");
    setSuggestions([]);
  };

  const suggest = () =>
    startSuggesting(async () => {
      setSuggestError(null);
      const result = await suggestBackTranslations({
        foreignTitle: foreignTitle.trim(),
        language: language.trim(),
        country: country.trim() || null,
      });
      if (result.ok) setSuggestions(result.candidates);
      else setSuggestError(result.error);
    });

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-ink/15 p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="font-semibold">
          {film.title}
          {film.year && <span className="font-normal text-ink-soft"> ({film.year})</span>}
        </p>
        <button type="button" onClick={onCancel} className="text-sm underline underline-offset-2">
          Choose another film
        </button>
      </div>

      <div>
        <p className="text-sm font-semibold">Foreign titles on TMDB</p>
        {optionsError && (
          <p role="alert" className="mt-1 text-sm text-marker">
            {optionsError}
          </p>
        )}
        {!options && !optionsError && <p className="mt-1 text-sm text-ink-soft">Loading titles&hellip;</p>}
        {options && options.length === 0 && (
          <p className="mt-1 text-sm text-ink-soft">TMDB has no foreign titles for this film. Type one below.</p>
        )}
        {options && options.length > 0 && (
          <ul className="mt-2 flex max-h-64 flex-wrap gap-2 overflow-y-auto">
            {options.map((option) => (
              <li key={`${option.title}|${option.country}|${option.language}`}>
                <button
                  type="button"
                  onClick={() => choose(option)}
                  aria-pressed={foreignTitle === option.title && (option.country ?? "") === country}
                  className="flex flex-col items-start rounded-lg border border-ink/20 px-3 py-1.5 text-left hover:bg-ink/5 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-table"
                >
                  <span lang={option.language ?? undefined} className="font-semibold">
                    {option.title}
                  </span>
                  <span className="text-xs opacity-75">
                    {[option.languageName, option.countryName].filter(Boolean).join(", ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.title} className="text-sm font-semibold">
            Foreign title
          </label>
          <input
            id={ids.title}
            value={foreignTitle}
            onChange={(event) => setForeignTitle(event.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.language} className="text-sm font-semibold">
            Language code
          </label>
          <input
            id={ids.language}
            value={language}
            maxLength={3}
            placeholder="es"
            onChange={(event) => setLanguage(event.target.value)}
            aria-describedby={`${ids.language}-name`}
            className={inputClass}
          />
          <span id={`${ids.language}-name`} className="text-xs text-ink-soft">
            {languageOk ? languageName(language.trim().toLowerCase()) : "Two letters, like es"}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.country} className="text-sm font-semibold">
            Country code <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input
            id={ids.country}
            value={country}
            maxLength={2}
            placeholder="MX"
            onChange={(event) => setCountry(event.target.value)}
            aria-describedby={`${ids.country}-name`}
            className={inputClass}
          />
          <span id={`${ids.country}-name`} className="text-xs text-ink-soft">
            {country.trim() && countryOk ? countryName(country.trim()) : "Two letters, like MX"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <label htmlFor={ids.literal} className="text-sm font-semibold">
            Literal translation <span className="font-normal text-ink-soft">(word for word, not the real title)</span>
          </label>
          <button
            type="button"
            onClick={suggest}
            disabled={!canSuggest}
            className="min-h-9 rounded-full border-[1.5px] border-ink px-4 text-sm font-semibold disabled:opacity-35"
          >
            {suggesting ? "Asking…" : "Suggest translations"}
          </button>
        </div>
        <input
          id={ids.literal}
          value={literal}
          onChange={(event) => setLiteral(event.target.value)}
          className={inputClass}
        />
        {suggestError && (
          <p role="alert" className="text-sm text-marker">
            {suggestError}
          </p>
        )}
        {suggestions.length > 0 && (
          <ul aria-label="Suggested translations" className="flex flex-wrap gap-2">
            {suggestions.map((candidate) => (
              <li key={candidate}>
                <button
                  type="button"
                  onClick={() => setLiteral(candidate)}
                  className="rounded-full bg-ink/8 px-3 py-1 text-sm hover:bg-ink/15"
                >
                  {candidate}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-marker">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={!canAdd}
        onClick={() =>
          run(
            () =>
              addWarmupEntry(puzzleId, {
                filmId: film.tmdbId,
                foreignTitle: foreignTitle.trim(),
                language: language.trim(),
                country: country.trim() || null,
                literalTranslation: literal.trim(),
              }),
            onCancel,
          )
        }
        className="min-h-11 self-start rounded-full bg-ink px-6 font-semibold text-table disabled:opacity-35"
      >
        Add to the warm-up
      </button>
    </div>
  );
}
