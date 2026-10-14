"use client";

import Image from "next/image";
import { useEffect, useReducer, useRef, useState, type DragEvent } from "react";

import { checkBonus, fetchBonus } from "@/lib/game/api";
import { allAssigned, bonusReducer, correctCount, initialBonusState } from "@/lib/game/bonus-state";
import type { BonusFilm, PublicBonus } from "@/lib/puzzle/types";
import { Barcode } from "./Barcode";

const FILM_DRAG_TYPE = "application/x-cinemadle-film";
const describe = (film: BonusFilm) => `${film.title}${film.year ? ` (${film.year})` : ""}`;

/**
 * Round 3: match each film's barcode to the film. Tap a barcode then a film (or
 * the other way round), or drag a film onto a barcode, then check all four at once.
 */
export function BonusRound({ apiBase }: { apiBase: string }) {
  const [bonus, setBonus] = useState<PublicBonus | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [state, dispatch] = useReducer(bonusReducer, initialBonusState);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const summaryRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBonus(apiBase).then(
      (loaded) => !cancelled && setBonus(loaded),
      () => !cancelled && setLoadError(true),
    );
    return () => {
      cancelled = true;
    };
  }, [apiBase, attempt]);

  useEffect(() => {
    if (state.results) summaryRef.current?.focus();
  }, [state.results]);

  if (!bonus) {
    return (
      <section aria-labelledby="bonus-heading" className="mt-6">
        <h2 id="bonus-heading" className="sr-only">
          Bonus round
        </h2>
        {loadError ? (
          <p>
            Couldn&apos;t load the bonus round.{" "}
            <button
              type="button"
              className="font-semibold underline underline-offset-2"
              onClick={() => {
                setLoadError(false);
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </button>
          </p>
        ) : (
          <p className="text-ink-soft">Developing the barcodes&hellip;</p>
        )}
      </section>
    );
  }

  const filmsById = new Map(bonus.films.map((f) => [f.filmId, f]));
  const usedFilms = new Set(Object.values(state.assignments));
  const resultFor = (barcodeId: string) => state.results?.find((r) => r.barcodeId === barcodeId);
  const done = state.results !== null;
  const barcodeNumber = (barcodeId: string) => bonus.barcodes.findIndex((b) => b.id === barcodeId) + 1;

  const pickFilm = (film: BonusFilm) => {
    if (state.picked?.kind === "barcode") {
      setAnnouncement(`${film.title} placed on barcode ${barcodeNumber(state.picked.barcodeId)}.`);
    }
    dispatch({ type: "pick_film", filmId: film.filmId });
  };

  const pickBarcode = (barcodeId: string) => {
    if (state.picked?.kind === "film") {
      const film = filmsById.get(state.picked.filmId);
      if (film) setAnnouncement(`${film.title} placed on barcode ${barcodeNumber(barcodeId)}.`);
    }
    dispatch({ type: "pick_barcode", barcodeId });
  };

  const onDrop = (event: DragEvent, barcodeId: string) => {
    const filmId = Number(event.dataTransfer.getData(FILM_DRAG_TYPE));
    if (!filmId) return;
    event.preventDefault();
    dispatch({ type: "assign", barcodeId, filmId });
  };

  async function check() {
    if (checking) return;
    setChecking(true);
    setCheckError(false);
    try {
      const { results } = await checkBonus(apiBase, state.assignments);
      dispatch({ type: "checked", results });
    } catch {
      setCheckError(true);
    } finally {
      setChecking(false);
    }
  }

  return (
    <section aria-labelledby="bonus-heading" className="mt-6">
      <h2 id="bonus-heading" className="font-display text-[2.2rem] font-[850] leading-none">
        Bonus round
      </h2>
      {done ? (
        <h3 ref={summaryRef} tabIndex={-1} className="mt-2 font-display text-[1.6rem] font-[850] leading-none">
          {correctCount(state)} of {bonus.barcodes.length} matched
        </h3>
      ) : (
        <p className="mt-2 text-ink-soft">
          Each barcode is one of today&apos;s films: every band is the main colour of one of its stills. Match them up.
        </p>
      )}

      <ol aria-label="Barcodes" className="mt-5 flex flex-col gap-3">
        {bonus.barcodes.map((barcode, index) => {
          const film = filmsById.get(state.assignments[barcode.id]);
          const result = resultFor(barcode.id);
          const picked = state.picked?.kind === "barcode" && state.picked.barcodeId === barcode.id;
          const actual = result ? filmsById.get(result.filmId) : undefined;
          const ring = result
            ? result.correct
              ? "ring-[3px] ring-[var(--tier-1)]"
              : "ring-[3px] ring-marker"
            : picked
              ? "ring-[3px] ring-marker"
              : "";
          return (
            <li key={barcode.id}>
              <button
                type="button"
                disabled={done}
                aria-pressed={done ? undefined : picked}
                aria-label={`Barcode ${index + 1}${film ? `, matched with ${film.title}` : ", no film yet"}`}
                onClick={() => pickBarcode(barcode.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => onDrop(event, barcode.id)}
                className={`flex w-full flex-col overflow-hidden rounded-[6px] bg-sheet text-left text-white ring-offset-2 ring-offset-table ${ring}`}
              >
                <span className="block h-14 w-full p-1.5">
                  <Barcode barcode={barcode} delay={index * 220} />
                </span>
                <span className="flex min-h-10 items-center justify-between gap-2 px-3 pb-2 text-sm">
                  <span
                    className={
                      result && !result.correct
                        ? "text-white/60 line-through"
                        : film
                          ? "font-semibold"
                          : "text-white/60"
                    }
                  >
                    {film ? describe(film) : picked ? "Now pick its film" : "Tap to place a film"}
                  </span>
                  {result && (
                    <span className="shrink-0 font-semibold">
                      {result.correct ? "Right" : `It was ${actual?.title ?? "another film"}`}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {!done && (
        <>
          <ul aria-label="Films" className="mt-5 grid grid-cols-2 gap-3">
            {bonus.films.map((film) => {
              const picked = state.picked?.kind === "film" && state.picked.filmId === film.filmId;
              const used = usedFilms.has(film.filmId);
              return (
                <li key={film.filmId}>
                  <button
                    type="button"
                    draggable
                    aria-pressed={picked}
                    onDragStart={(event) => {
                      event.dataTransfer.setData(FILM_DRAG_TYPE, String(film.filmId));
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => pickFilm(film)}
                    className={`flex w-full items-center gap-2.5 rounded-[6px] bg-surface p-2 text-left ring-1 ring-ink/15 ${
                      picked ? "ring-[3px] ring-marker" : ""
                    } ${used && !picked ? "opacity-55" : ""}`}
                  >
                    <span className="relative h-14 w-[2.4rem] shrink-0 overflow-hidden rounded-[2px] bg-sheet">
                      {film.posterUrl && (
                        <Image src={film.posterUrl} alt="" fill unoptimized sizes="2.5rem" className="object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 text-sm font-semibold leading-tight">
                      {film.title}
                      {film.year && <span className="block font-normal text-ink-soft">{film.year}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {checkError && (
            <p role="alert" className="mt-3 text-center text-marker">
              Couldn&apos;t check your matches. Try again.
            </p>
          )}
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={check}
              disabled={checking || !allAssigned(state, bonus)}
              className="min-h-12 rounded-full bg-ink px-7 text-lg font-semibold text-table disabled:opacity-35"
            >
              Check matches
            </button>
          </div>
        </>
      )}

      {done && (
        <p className="mt-6 text-center text-ink-soft">That&apos;s today&apos;s puzzle. A new one opens at midnight.</p>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
