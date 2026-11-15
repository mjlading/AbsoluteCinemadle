"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { RULES } from "@/config/rules";
import { SITE } from "@/config/site";
import { guessCarbonYear, fetchCarbonDay } from "@/lib/carbon-dating/api";
import {
  carbonShareText,
  clampYear,
  distanceSquare,
  maxTotal,
  maxYear,
  totalPoints,
  type CarbonRoundResult,
  type PublicCarbonBoard,
} from "@/lib/carbon-dating/game";
import { carbonReducer, initialCarbonState } from "@/lib/carbon-dating/state";
import { addDays, formatPuzzleDate, localIsoDate } from "@/lib/dates";
import { ApiError } from "@/lib/game/api";
import { usePersistentReducer } from "@/lib/game/storage";

const button =
  "h-12 rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50";
const primary = `${button} bg-ink text-table hover:bg-ink/85`;
const secondary = `${button} bg-ink/7 hover:bg-ink/12`;

/**
 * Loads one day's board, then plays it; progress is kept on this device.
 * Without a date it is today's board, by the player's own calendar.
 */
export function CarbonDatingGame({ date }: { date?: string }) {
  const [board, setBoard] = useState<PublicCarbonBoard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = localIsoDate();
    const ahead = date !== undefined && date > today;
    (ahead ? Promise.reject(new Error("ahead")) : fetchCarbonDay(date ?? today)).then(
      (loaded) => !cancelled && setBoard(loaded),
      (reason: unknown) =>
        !cancelled &&
        setError(
          ahead
            ? "That day hasn't come yet."
            : reason instanceof ApiError && reason.status === 404
              ? "There's no Carbon Dating for that day."
              : "Couldn't load the stills. Check your connection and try again.",
        ),
    );
    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <>
      <header className="mx-auto flex w-full max-w-[44rem] items-center gap-3 px-4 py-4">
        <Link
          href="/"
          className="rounded-lg px-2 py-1 font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ink"
        >
          &larr; Home
        </Link>
        <h1 className="font-display text-2xl font-extrabold uppercase">Carbon Dating</h1>
      </header>
      <main className="mx-auto w-full max-w-[44rem] flex-1 px-4 pb-12">
        {board ? (
          <CarbonDatingPlay key={board.id} board={board} />
        ) : (
          <p className="pt-12 text-center text-ink-soft">{error ?? "Picking today's stills…"}</p>
        )}
      </main>
    </>
  );
}

function CarbonDatingPlay({ board }: { board: PublicCarbonBoard }) {
  const rounds = board.rounds.length;
  const reducer = useMemo(() => carbonReducer(rounds), [rounds]);
  const [state, dispatch] = usePersistentReducer(
    `carbon-dating:${board.id}`,
    `${board.id}:${rounds}`,
    reducer,
    undefined,
    initialCarbonState,
  );
  const latest = maxYear();
  const startYear = Math.round((RULES.carbonDating.minYear + latest) / 2);
  const [year, setYear] = useState(startYear);
  const [typed, setTyped] = useState(String(startYear));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const moved = useRef(false);

  const { position, results } = state;
  const over = position >= rounds;
  const reveal = !over && results.length > position ? results[position] : null;

  // A new round starts from the middle again, with the slider focused for keyboard players.
  useEffect(() => {
    if (!moved.current) return;
    sliderRef.current?.focus();
  }, [position]);

  function pick(value: number) {
    const next = clampYear(value);
    setYear(next);
    setTyped(String(next));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || reveal || over) return;
    const guess = clampYear(Number(typed));
    pick(guess);
    setBusy(true);
    setError(null);
    try {
      const result = await guessCarbonYear(board.id, position, guess);
      dispatch({ type: "revealed", result: { ...result, guess } });
    } catch {
      setError("That guess couldn't be checked. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    moved.current = true;
    pick(startYear);
    dispatch({ type: "next" });
  }

  const previousDay = addDays(board.date, -1);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink-soft">
        {formatPuzzleDate(board.date)} &middot; Date each still to its film&rsquo;s release year.
      </p>

      {over ? (
        <Recap board={board} results={results} />
      ) : (
        <section aria-labelledby="round-heading" className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <h2 id="round-heading" className="text-lg font-bold">
              Still {position + 1} of {rounds}
            </h2>
            <p className="text-ink-soft">
              {totalPoints(results)} / {maxTotal()} points
            </p>
          </div>
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-sheet">
            <Image
              src={board.rounds[position].imageUrl}
              alt={`Still ${position + 1} of ${rounds}`}
              fill
              unoptimized
              priority
              sizes="(min-width: 44rem) 42rem, 100vw"
              className="object-cover"
            />
          </div>

          {reveal ? (
            <div className="flex flex-col gap-3 rounded-xl bg-surface p-4" role="status">
              <p className="text-xl font-bold">
                {reveal.title} ({reveal.year})
              </p>
              <p>
                You said {reveal.guess}
                {reveal.guess === reveal.year
                  ? ": spot on!"
                  : `, ${Math.abs(reveal.guess - reveal.year)} year${Math.abs(reveal.guess - reveal.year) === 1 ? "" : "s"} off.`}{" "}
                <strong>+{reveal.points} points</strong>
              </p>
              <button type="button" className={primary} onClick={next} autoFocus>
                {position + 1 < rounds ? "Next still" : "See results"}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl bg-surface p-4">
              <label htmlFor="carbon-year-slider" className="font-semibold">
                Release year
              </label>
              <input
                id="carbon-year-slider"
                ref={sliderRef}
                type="range"
                min={RULES.carbonDating.minYear}
                max={latest}
                step={1}
                value={year}
                onChange={(e) => pick(Number(e.target.value))}
                className="w-full accent-[var(--marker)]"
              />
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  className={`${secondary} w-12`}
                  onClick={() => pick(year - 1)}
                  aria-label="One year earlier"
                >
                  &minus;
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  aria-label="Release year, typed"
                  min={RULES.carbonDating.minYear}
                  max={latest}
                  value={typed}
                  onChange={(e) => {
                    setTyped(e.target.value);
                    const n = Number(e.target.value);
                    if (e.target.value.length === 4 && Number.isInteger(n)) setYear(clampYear(n));
                  }}
                  onBlur={() => pick(Number(typed))}
                  className="h-12 w-28 rounded-xl border border-ink/20 bg-table text-center text-2xl font-bold focus-visible:outline-2 focus-visible:outline-ink"
                />
                <button
                  type="button"
                  className={`${secondary} w-12`}
                  onClick={() => pick(year + 1)}
                  aria-label="One year later"
                >
                  +
                </button>
              </div>
              <button type="submit" className={primary} disabled={busy}>
                {busy ? "Checking…" : `Submit ${typed || year}`}
              </button>
              {error && <p className="text-marker">{error}</p>}
            </form>
          )}
        </section>
      )}

      {previousDay >= SITE.prototypeLaunchDate && (
        <Link
          href={`${SITE.games.carbonDating}/${previousDay}`}
          className="self-start rounded font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ink"
        >
          Previous day
        </Link>
      )}
    </div>
  );
}

function Recap({ board, results }: { board: PublicCarbonBoard; results: CarbonRoundResult[] }) {
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);

  async function share() {
    try {
      await navigator.clipboard.writeText(carbonShareText(board.date, results));
      setCopied("yes");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <section aria-labelledby="recap-heading" className="flex flex-col gap-4">
      <h2 id="recap-heading" className="text-2xl font-bold">
        {totalPoints(results)} / {maxTotal()} points
      </h2>
      <ol className="flex flex-col gap-2">
        {results.map((r, i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl bg-surface p-3">
            <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-md bg-sheet">
              <Image
                src={board.rounds[i].imageUrl}
                alt={`Still ${i + 1}`}
                fill
                unoptimized
                sizes="6rem"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {r.title} ({r.year})
              </p>
              <p className="text-ink-soft">
                You said {r.guess} &middot; {r.points} pts
              </p>
            </div>
            <span aria-hidden="true">{distanceSquare(r.guess, r.year)}</span>
          </li>
        ))}
      </ol>
      <button type="button" className={primary} onClick={share}>
        {copied === "yes" ? "Copied" : copied === "failed" ? "Couldn't copy" : "Share"}
      </button>
    </section>
  );
}
