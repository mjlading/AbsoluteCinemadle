"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Confetti } from "@/components/game/Confetti";
import { GameTopBar } from "@/components/game/GameTopBar";
import { ReelSpinner } from "@/components/game/ReelSpinner";
import { ResultActions } from "@/components/game/ResultActions";
import { DailyLeaderboard } from "@/components/leaderboard/DailyLeaderboard";
import { POINTS } from "@/config/scoring";
import { SITE } from "@/config/site";
import { localIsoDate } from "@/lib/dates";
import { ApiError } from "@/lib/game/api";
import { readJson, usePersistentReducer, writeJson } from "@/lib/game/storage";
import { fetchRatingsCliffDay, guessRatingsCliff } from "@/lib/ratings-cliff/api";
import { ratingsCliffNumber, ratingsCliffTitle } from "@/lib/ratings-cliff/day";
import {
  initialRatingsCliffState,
  isCorrect,
  isFinished,
  ratingsCliffReducer,
  ratingsCliffScore,
  ratingsCliffShareText,
  type RatingsCliffState,
} from "@/lib/ratings-cliff/state";
import type { PublicRatingsCliffBoard } from "@/lib/ratings-cliff/types";
import { HelpDialog } from "./HelpDialog";
import { RatingsChart } from "./RatingsChart";

export const ratingsCliffStorageKey = (boardId: string) => `ratings-cliff:${boardId}`;

const TITLE = "Ratings Cliff";
const HELP_SEEN_KEY = "ratings-cliff:help-seen";
/** The right option once picked: the cyan-to-green end of the chart's own scale. */
const RIGHT = "bg-[#3fb57a] text-on-tape ring-[#3fb57a]";

/**
 * Loads one day's board, then plays it; progress is kept on this device.
 * Without a date it is today's board, by the player's own calendar.
 */
export function RatingsCliffGame({ date }: { date?: string }) {
  const [board, setBoard] = useState<PublicRatingsCliffBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const today = localIsoDate();
    // A day still ahead of the player's own calendar stays closed, even when the server would allow it.
    const ahead = date !== undefined && date > today;
    (ahead ? Promise.reject(new Error("ahead")) : fetchRatingsCliffDay(date ?? today)).then(
      (loaded) => {
        if (cancelled) return;
        setBoard(loaded);
        if (readJson(HELP_SEEN_KEY) === null) setHelpOpen(true);
      },
      (reason: unknown) =>
        !cancelled &&
        setError(
          ahead
            ? "That day hasn't come yet."
            : reason instanceof ApiError && reason.status === 404
              ? date
                ? "There's no Ratings Cliff for that day."
                : "No Ratings Cliff today. Come back tomorrow."
              : "Couldn't load the charts. Check your connection and try again.",
        ),
    );
    return () => {
      cancelled = true;
    };
  }, [date]);

  if (!board) {
    return (
      <>
        <GameTopBar title={TITLE} number={null} archiveHref={SITE.games.ratingsCliffArchive} />
        <main className="flex flex-1 justify-center px-4 pt-16">
          {error ? (
            <div className="text-center">
              <p>{error}</p>
              <Link
                href={SITE.games.ratingsCliffArchive}
                className="mt-3 inline-block font-semibold underline underline-offset-4"
              >
                Previous days
              </Link>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-ink-soft">
              <ReelSpinner className="size-5" /> Loading the charts&hellip;
            </p>
          )}
        </main>
      </>
    );
  }
  return (
    <>
      <GameTopBar
        title={TITLE}
        number={ratingsCliffNumber(board.date)}
        archiveHref={SITE.games.ratingsCliffArchive}
        onHelp={() => setHelpOpen(true)}
      />
      <main className="mx-auto w-full max-w-[34rem] flex-1 px-4 pb-12">
        <RatingsCliffPlay key={board.id} board={board} />
      </main>
      <HelpDialog
        open={helpOpen}
        onClose={() => {
          setHelpOpen(false);
          writeJson(HELP_SEEN_KEY, true);
        }}
      />
    </>
  );
}

function RatingsCliffPlay({ board }: { board: PublicRatingsCliffBoard }) {
  const reducer = useMemo(() => ratingsCliffReducer(board.rounds.length), [board]);
  const [state, dispatch] = usePersistentReducer(
    ratingsCliffStorageKey(board.id),
    board.rounds.map((r) => r.options.map((o) => o.id).join(",")).join(";"),
    reducer,
    undefined,
    initialRatingsCliffState,
  );
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const revealRef = useRef<HTMLHeadingElement>(null);
  const roundRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const total = board.rounds.length;
  const finished = isFinished(state, total);
  const index = Math.min(state.advanced, total - 1);
  const round = board.rounds[index];
  const answer = finished ? undefined : state.answers[index];

  // Focus follows the game (not on first load): to the reveal after a pick, to the next chart after Next.
  useEffect(() => {
    if (!moved.current) return;
    (answer ? revealRef.current : roundRef.current)?.focus();
  }, [answer, index]);

  async function pick(option: string) {
    if (busy || answer || finished) return;
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

  if (finished) return <EndPanel board={board} state={state} />;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-4">
        <h2 id="rc-round" ref={roundRef} tabIndex={-1} className="text-sm text-ink-soft outline-none">
          Series <strong className="text-ink">{index + 1}</strong> of {total}
        </h2>
        <RoundDots state={state} total={total} current={index} />
      </div>

      <div className="mt-3">
        <RatingsChart seasons={round.seasons} />
      </div>

      <p id="rc-question" className="mt-4 font-display text-2xl font-[900] leading-none">
        Which series is this?
      </p>
      <div role="group" aria-labelledby="rc-question" className="mt-3 grid grid-cols-2 gap-2">
        {round.options.map((o) => {
          const chosen = answer?.option === o.id;
          const right = answer?.result.correctOption === o.id;
          const tone = !answer
            ? "bg-surface ring-ink/15 hover:ring-ink"
            : right
              ? RIGHT
              : chosen
                ? "bg-marker-strong text-white ring-marker-strong"
                : "bg-surface ring-ink/10 text-ink-soft";
          return (
            <button
              key={o.id}
              type="button"
              disabled={busy || Boolean(answer)}
              onClick={() => pick(o.id)}
              className={`min-h-14 rounded-xl px-3 py-2 text-left font-semibold leading-tight ring-1 transition-colors disabled:cursor-default ${tone}`}
            >
              {o.title}
              {answer && right && <span className="sr-only"> (the answer)</span>}
              {answer && chosen && !right && <span className="sr-only"> (your pick)</span>}
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="mt-2 flex min-h-6 items-center gap-2 text-sm">
        {busy ? (
          <span className="flex items-center gap-2 text-ink-soft">
            <ReelSpinner className="size-4" /> Checking&hellip;
          </span>
        ) : failed ? (
          <span role="alert" className="font-semibold text-marker">
            {failed}
          </span>
        ) : null}
      </p>

      {answer && (
        <section
          aria-labelledby="rc-reveal"
          className="closeups-rise mt-2 rounded-lg bg-surface p-5 ring-1 ring-ink/15"
        >
          <p className="text-[13px] font-semibold leading-none text-ink-soft">
            {isCorrect(answer) ? "Got it" : "It was"}
          </p>
          <h3
            id="rc-reveal"
            ref={revealRef}
            tabIndex={-1}
            className="mt-1.5 font-display text-3xl font-[900] leading-[0.95] text-balance outline-none"
          >
            {answer.result.series}
          </h3>
          <p className="mt-2 leading-snug text-ink-soft">{answer.result.reveal}</p>
          <button
            type="button"
            onClick={() => {
              moved.current = true;
              dispatch({ type: "next" });
            }}
            className="mt-4 h-12 w-full rounded-xl bg-ink font-semibold text-table transition-colors hover:bg-ink/85"
          >
            {index + 1 < total ? "Next series" : "See your score"}
          </button>
        </section>
      )}
    </div>
  );
}

/** A dot per series: green or red once picked, the current one ringed, the rest empty. */
function RoundDots({ state, total, current }: { state: RatingsCliffState; total: number; current: number }) {
  const right = state.answers.filter(isCorrect).length;
  return (
    <p className="flex justify-end gap-1.5" aria-label={`${state.answers.length} of ${total} picked, ${right} right`}>
      {Array.from({ length: total }, (_, i) => {
        const a = state.answers[i];
        const tone = a
          ? isCorrect(a)
            ? "bg-[#3fb57a]"
            : "bg-marker-strong"
          : i === current
            ? "bg-transparent ring-2 ring-inset ring-ink"
            : "bg-transparent ring-[1.5px] ring-inset ring-ink/30";
        return <span key={i} aria-hidden="true" className={`size-3.5 rounded-full ${tone}`} />;
      })}
    </p>
  );
}

/** The end panel's heading; the score sits beside it. */
function endHeading(right: number, total: number): string {
  if (right === total) return "Perfect run!";
  if (right === 0) return "Off the cliff";
  return right * 2 > total ? "Good eye" : "Rough ratings";
}

function EndPanel({ board, state }: { board: PublicRatingsCliffBoard; state: RatingsCliffState }) {
  const total = board.rounds.length;
  const score = ratingsCliffScore(state);
  const max = total * POINTS.ratingsCliff.perCorrect;
  const right = state.answers.filter(isCorrect).length;
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The board this replaces had focus, so focus moves to the result.
  useEffect(() => headingRef.current?.focus({ preventScroll: true }), []);

  return (
    <>
      {right === total && <Confetti />}
      <section aria-labelledby="rc-end" className="mt-3 rounded-lg bg-surface p-5 ring-1 ring-ink/15">
        <div className="flex items-start justify-between gap-4">
          <h2
            id="rc-end"
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-4xl font-[900] leading-none outline-none"
          >
            {endHeading(right, total)}
          </h2>
          <p className="shrink-0 text-right">
            <span data-testid="score" className="block font-display text-[52px] font-[900] leading-[0.85] tabular-nums">
              {score}
            </span>
            <span className="text-xs font-semibold text-ink-soft">of {max}</span>
          </p>
        </div>
        <ol className="mt-4 flex flex-col gap-2">
          {state.answers.map((a, i) => (
            <li key={i} className="flex gap-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 size-4 shrink-0 rounded-[4px] ${isCorrect(a) ? "bg-[#3fb57a]" : "bg-marker-strong"}`}
              />
              <span className="min-w-0 leading-tight">
                <span className="sr-only">{isCorrect(a) ? "Right: " : "Missed: "}</span>
                <span className="font-semibold">{a.result.series}</span>
                <span className="block text-sm text-ink-soft">{a.result.reveal}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-5">
          <ResultActions
            shareText={() => ratingsCliffShareText(ratingsCliffTitle(board.date), state, total)}
            archiveHref={SITE.games.ratingsCliffArchive}
          />
        </div>
        <DailyLeaderboard
          boardId={board.id}
          date={board.date}
          moves={{ game: "ratings-cliff", picks: state.answers.map((a) => a.option) }}
        />
      </section>
    </>
  );
}
