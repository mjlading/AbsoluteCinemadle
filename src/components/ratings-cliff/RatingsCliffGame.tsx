"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";
import { SITE } from "@/config/site";
import { addDays, formatPuzzleDate, localIsoDate } from "@/lib/dates";
import { ApiError } from "@/lib/game/api";
import { usePersistentReducer } from "@/lib/game/storage";
import { fetchRatingsCliffDay, guessRatingsCliff } from "@/lib/ratings-cliff/api";
import { chartClue } from "@/lib/ratings-cliff/chart";
import {
  initialRatingsCliffState,
  isCorrect,
  isFinished,
  ratingsCliffReducer,
  ratingsCliffScore,
  ratingsCliffShareText,
} from "@/lib/ratings-cliff/state";
import type { PublicRatingsCliffBoard } from "@/lib/ratings-cliff/types";
import { RatingsChart } from "./RatingsChart";

const TITLE = "Ratings Cliff";
const ROUNDS = RULES.ratingsCliff.rounds;

/**
 * Loads one day's board, then plays it; progress is kept on this device.
 * Without a date it is today's board, by the player's own calendar.
 */
export function RatingsCliffGame({ date }: { date?: string }) {
  const [board, setBoard] = useState<PublicRatingsCliffBoard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = localIsoDate();
    const target = date ?? today;
    const ahead = target > today;
    (ahead ? Promise.reject(new Error("ahead")) : fetchRatingsCliffDay(target)).then(
      (loaded) => !cancelled && setBoard(loaded),
      (reason: unknown) =>
        !cancelled &&
        setError(
          ahead
            ? "That day hasn't come yet."
            : reason instanceof ApiError && reason.status === 404
              ? "There's no Ratings Cliff for that day."
              : "Couldn't load the board. Check your connection and try again.",
        ),
    );
    return () => {
      cancelled = true;
    };
  }, [date]);

  const day = board?.date ?? date ?? null;
  const previous = day && addDays(day, -1) >= SITE.prototypeLaunchDate ? addDays(day, -1) : null;

  return (
    <>
      <header className="mx-auto flex w-full max-w-[34rem] items-center gap-3 px-4 pb-2 pt-4">
        <Link href="/" className="rounded px-1 font-semibold text-ink-soft underline-offset-4 hover:underline">
          &larr; Home
        </Link>
        <h1 className="font-display text-2xl font-extrabold">{TITLE}</h1>
        {day && <span className="ml-auto text-sm text-ink-soft">{formatPuzzleDate(day)}</span>}
      </header>
      <main className="mx-auto w-full max-w-[34rem] flex-1 px-4 pb-10">
        {board ? (
          <Play key={board.id} board={board} />
        ) : (
          <p className="pt-12 text-center text-ink-soft">{error ?? "Loading the charts…"}</p>
        )}
        {previous && (
          <p className="mt-8 text-center">
            <Link
              href={`${SITE.games.ratingsCliff}/${previous}`}
              className="font-semibold underline underline-offset-4"
            >
              Previous day
            </Link>
          </p>
        )}
      </main>
    </>
  );
}

function Play({ board }: { board: PublicRatingsCliffBoard }) {
  const reducer = useMemo(() => ratingsCliffReducer(board.rounds.length), [board]);
  const [state, dispatch] = usePersistentReducer(
    `ratings-cliff:${board.id}`,
    board.rounds.map((r) => r.options.map((o) => o.id).join(",")).join(";"),
    reducer,
    undefined,
    initialRatingsCliffState,
  );
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const roundRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const finished = isFinished(state, board.rounds.length);
  const index = state.advanced;
  const round = board.rounds[index];
  const answer = state.answers[index];

  // Move focus along with the game (not on first load): to the reveal after a pick, to the next round after Next.
  useEffect(() => {
    if (!moved.current) return;
    (answer ? revealRef.current : roundRef.current)?.focus();
  }, [answer, index]);

  async function pick(option: string) {
    if (busy || answer) return;
    setBusy(true);
    setFailed(null);
    try {
      const result = await guessRatingsCliff(board.id, index, option);
      moved.current = true;
      dispatch({ type: "answered", round: index, answer: { option, result } });
    } catch {
      setFailed("Couldn't check that pick. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (finished) return <Results board={board} state={state} />;

  return (
    <section aria-labelledby="rc-round" className="space-y-3">
      <p className="text-sm text-ink-soft">
        Which TV series is this? Every cell is an episode, coloured by its TMDB rating.
      </p>
      <h2 id="rc-round" ref={roundRef} tabIndex={-1} className="font-condensed text-lg font-extrabold">
        Series {index + 1} of {board.rounds.length}
      </h2>
      <RatingsChart seasons={round.seasons} />
      <p className="text-sm text-ink-soft">{chartClue(round.seasons)}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {round.options.map((o) => {
          const chosen = answer?.option === o.id;
          const right = answer?.result.correctOption === o.id;
          const tone = !answer
            ? "bg-ink/7 hover:bg-ink/12"
            : right
              ? "bg-[#2e9b5f] text-white"
              : chosen
                ? "bg-marker-strong text-white"
                : "bg-ink/7 opacity-60";
          return (
            <button
              key={o.id}
              type="button"
              disabled={busy || Boolean(answer)}
              onClick={() => pick(o.id)}
              className={`min-h-12 rounded-xl px-3 py-2 text-left font-semibold transition-colors ${tone}`}
            >
              {o.title}
              {answer && right && <span className="sr-only"> (the answer)</span>}
              {answer && chosen && !right && <span className="sr-only"> (your pick)</span>}
            </button>
          );
        })}
      </div>
      {failed && (
        <p role="alert" className="text-marker">
          {failed}
        </p>
      )}
      {answer && (
        <div ref={revealRef} tabIndex={-1} className="space-y-2 rounded-xl bg-surface p-4" aria-live="polite">
          <p className="font-semibold">
            {isCorrect(answer) ? "Right! " : "Not quite. "}
            It&rsquo;s {answer.result.series}.
          </p>
          <p className="text-sm text-ink-soft">{answer.result.reveal}</p>
          <button
            type="button"
            onClick={() => {
              moved.current = true;
              dispatch({ type: "next" });
            }}
            className="h-11 w-full rounded-xl bg-ink font-semibold text-table hover:bg-ink/85"
          >
            {index + 1 < board.rounds.length ? "Next series" : "See your score"}
          </button>
        </div>
      )}
    </section>
  );
}

function Results({
  board,
  state,
}: {
  board: PublicRatingsCliffBoard;
  state: ReturnType<typeof initialRatingsCliffState>;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const max = board.rounds.length * POINTS.ratingsCliff.perCorrect;

  async function share() {
    try {
      await navigator.clipboard.writeText(ratingsCliffShareText(board.date, state, ROUNDS));
      setCopied("Copied");
    } catch {
      setCopied("Couldn't copy");
    }
  }

  return (
    <section aria-labelledby="rc-done" className="space-y-4">
      <h2 id="rc-done" className="font-display text-3xl font-extrabold">
        {ratingsCliffScore(state)} / {max}
      </h2>
      <ol className="space-y-2">
        {state.answers.map((a, i) => (
          <li key={i} className="rounded-xl bg-surface p-3">
            <p className="font-semibold">
              <span aria-hidden>{isCorrect(a) ? "🟩" : "🟥"}</span>{" "}
              <span className="sr-only">{isCorrect(a) ? "Right:" : "Wrong:"}</span> {a.result.series}
            </p>
            <p className="text-sm text-ink-soft">{a.result.reveal}</p>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={share}
        className="h-12 w-full rounded-xl bg-ink font-semibold text-table transition-colors hover:bg-ink/85"
      >
        {copied ?? "Share"}
      </button>
    </section>
  );
}
