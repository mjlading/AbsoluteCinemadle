"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { RULES } from "@/config/rules";
import { SITE } from "@/config/site";
import { addDays, formatPuzzleDate, localIsoDate } from "@/lib/dates";
import { ApiError } from "@/lib/game/api";
import { usePersistentReducer } from "@/lib/game/storage";
import { fetchHowOldDay, guessHowOld } from "@/lib/how-old/api";
import { closenessMark, maxPoints, shareText } from "@/lib/how-old/scoring";
import { howOldReducer, initialHowOldState, type HowOldResult } from "@/lib/how-old/state";
import type { PublicHowOldBoard, PublicHowOldRound } from "@/lib/how-old/types";

const { minAge, maxAge, startAge } = RULES.howOld;

const button =
  "h-12 rounded-xl px-4 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50";
const primary = `${button} bg-ink text-table hover:bg-ink/85`;
const secondary = `${button} bg-ink/7 hover:bg-ink/12`;

const clampAge = (n: number) => Math.min(maxAge, Math.max(minAge, Math.round(n)));

/**
 * Loads one day's board, then plays it; progress is kept on this device.
 * Without a date it is today's board, by the player's own calendar.
 */
export function HowOldGame({ date }: { date?: string }) {
  const [board, setBoard] = useState<PublicHowOldBoard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = localIsoDate();
    const ahead = date !== undefined && date > today;
    (ahead ? Promise.reject(new Error("ahead")) : fetchHowOldDay(date ?? today)).then(
      (loaded) => !cancelled && setBoard(loaded),
      (reason: unknown) =>
        !cancelled &&
        setError(
          ahead
            ? "That day hasn't come yet."
            : reason instanceof ApiError && reason.status === 404
              ? "There's no How Old Were They? for that day."
              : "Couldn't load the board. Check your connection and try again.",
        ),
    );
    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <>
      <header className="mx-auto flex w-full max-w-[40rem] items-center gap-3 px-4 py-4">
        <Link
          href="/"
          className="rounded-lg px-2 py-1 font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ink"
        >
          &larr; Home
        </Link>
        <h1 className="font-display text-2xl font-extrabold uppercase">How Old Were They?</h1>
      </header>
      <main className="mx-auto w-full max-w-[40rem] flex-1 px-4 pb-12">
        {board ? (
          <HowOldPlay key={board.id} board={board} />
        ) : (
          <p className="pt-12 text-center text-ink-soft">{error ?? "Casting today's actors…"}</p>
        )}
      </main>
    </>
  );
}

function HowOldPlay({ board }: { board: PublicHowOldBoard }) {
  const rounds = board.rounds.length;
  const [state, dispatch] = usePersistentReducer(
    `how-old:${board.id}`,
    board.id,
    howOldReducer(rounds),
    undefined,
    initialHowOldState,
  );
  // What the box shows, as typed; the guess is it clamped to the allowed ages (an empty box counts as the start age).
  const [text, setText] = useState(String(startAge));
  const age = clampAge(text.trim() === "" || Number.isNaN(Number(text)) ? startAge : Number(text));
  const setAge = (n: number) => setText(String(clampAge(n)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ageInput = useRef<HTMLInputElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);

  const finished = state.current >= rounds;
  const result: HowOldResult | undefined = state.results[state.current];
  const round = board.rounds[state.current];
  const total = state.results.reduce((sum, r) => sum + r.points, 0);

  // Keyboard players land on whatever comes next: the age after Next, Next after a reveal.
  const revealed = result !== undefined;
  const step = state.current * 2 + (revealed ? 1 : 0);
  const firstStep = useRef(step);
  useEffect(() => {
    if (step === firstStep.current) return;
    (revealed ? nextButton.current : ageInput.current)?.focus();
  }, [step, revealed]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || revealed || finished) return;
    const guess = clampAge(age);
    setBusy(true);
    setError(null);
    try {
      const reveal = await guessHowOld(board.id, state.current, guess);
      dispatch({ type: "reveal", result: { ...reveal, guess } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "That guess couldn't be checked. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setText(String(startAge));
    dispatch({ type: "next" });
  }

  const previousDay = addDays(board.date, -1);

  return (
    <>
      <p className="mb-3 flex justify-between text-sm text-ink-soft">
        <span>{formatPuzzleDate(board.date)}</span>
        <span>
          {finished ? "Final score" : `Round ${state.current + 1} of ${rounds}`} · {total} pts
        </span>
      </p>

      {finished ? (
        <EndScreen board={board} results={state.results} />
      ) : (
        <section aria-label={`Round ${state.current + 1} of ${rounds}`} className="rounded-2xl bg-surface p-4">
          <RoundCard round={round} index={state.current} />
          {result ? (
            <div className="mt-4" aria-live="polite">
              <p className="text-lg font-semibold">
                {round.actor} was {result.age} when {round.title} came out in {result.year}.
              </p>
              <p className="mt-1 text-ink-soft">
                You guessed {result.guess}:{" "}
                {result.guess === result.age
                  ? "exactly right!"
                  : `${Math.abs(result.guess - result.age)} ${Math.abs(result.guess - result.age) === 1 ? "year" : "years"} ${result.guess > result.age ? "too old" : "too young"}`}{" "}
                <strong className="text-ink">+{result.points} pts</strong>
              </p>
              <button ref={nextButton} type="button" onClick={next} className={`${primary} mt-4 w-full`}>
                {state.current + 1 < rounds ? "Next actor" : "See your score"}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-4">
              <label htmlFor="how-old-age" className="block font-semibold">
                How old was {round.actor} when {round.title} came out?
              </label>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  className={`${secondary} w-12 text-xl`}
                  aria-label="One year younger"
                  onClick={() => setAge(age - 1)}
                >
                  &minus;
                </button>
                <input
                  ref={ageInput}
                  id="how-old-age"
                  type="number"
                  inputMode="numeric"
                  min={minAge}
                  max={maxAge}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onBlur={() => setAge(age)}
                  className="h-12 w-20 rounded-xl border border-ink/20 bg-table text-center text-2xl font-bold focus-visible:outline-2 focus-visible:outline-ink"
                />
                <button
                  type="button"
                  className={`${secondary} w-12 text-xl`}
                  aria-label="One year older"
                  onClick={() => setAge(age + 1)}
                >
                  +
                </button>
                <button type="submit" disabled={busy} className={`${primary} flex-1`}>
                  {busy ? "Checking…" : "Guess"}
                </button>
              </div>
              <input
                type="range"
                min={minAge}
                max={maxAge}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                aria-label="Age"
                className="mt-4 w-full accent-ink"
              />
              <p className="flex justify-between text-xs text-ink-soft" aria-hidden>
                <span>{minAge}</span>
                <span>{maxAge}</span>
              </p>
              {error ? (
                <p role="alert" className="mt-2 text-marker-strong">
                  {error}
                </p>
              ) : null}
            </form>
          )}
        </section>
      )}

      {previousDay >= SITE.prototypeLaunchDate ? (
        <p className="mt-6 text-center">
          <Link
            href={`${SITE.games.howOld}/${previousDay}`}
            className="rounded px-1 font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ink"
          >
            Previous day
          </Link>
        </p>
      ) : null}
    </>
  );
}

function RoundCard({ round, index }: { round: PublicHowOldRound; index: number }) {
  return (
    <div className="flex gap-4">
      <Image
        src={round.posterUrl}
        alt={`Poster, round ${index + 1}`}
        width={120}
        height={180}
        unoptimized
        loading="eager"
        className="h-auto w-[96px] shrink-0 self-start rounded-lg bg-ink/10 sm:w-[120px]"
      />
      <div className="min-w-0">
        <p className="text-2xl leading-tight font-extrabold">{round.actor}</p>
        <p className="mt-2 text-ink-soft">as</p>
        <p className="font-semibold">{round.character}</p>
        <p className="mt-2 text-ink-soft">in</p>
        <p className="font-semibold">
          {round.title}
          {round.year ? ` (${round.year})` : ""}
        </p>
      </div>
    </div>
  );
}

function EndScreen({ board, results }: { board: PublicHowOldBoard; results: HowOldResult[] }) {
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);
  const total = results.reduce((sum, r) => sum + r.points, 0);

  async function share() {
    try {
      const url = `${SITE.url}${SITE.games.howOld}`;
      await navigator.clipboard.writeText(shareText(board.date, results, url));
      setCopied("yes");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <section aria-label="Your score" className="rounded-2xl bg-surface p-4">
      <p className="text-center text-4xl font-extrabold">
        {total} <span className="text-xl text-ink-soft">/ {maxPoints(results.length)}</span>
      </p>
      <ol className="mt-4 divide-y divide-ink/10">
        {results.map((r, i) => {
          const round = board.rounds[i];
          return (
            <li key={i} className="flex items-baseline gap-3 py-2">
              <span aria-hidden>{closenessMark(r.guess, r.age)}</span>
              <span className="min-w-0 flex-1">
                <strong>{round.actor}</strong> was {r.age} in {round.title} ({r.year})
                <span className="block text-sm text-ink-soft">You said {r.guess}</span>
              </span>
              <span className="font-semibold">+{r.points}</span>
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={share} className={`${primary} mt-4 w-full`}>
        {copied === "yes" ? "Copied" : copied === "failed" ? "Couldn't copy" : "Share"}
      </button>
    </section>
  );
}
