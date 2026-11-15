"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ReelSpinner } from "@/components/game/ReelSpinner";
import { POINTS } from "@/config/scoring";
import { SITE } from "@/config/site";
import { addDays, formatPuzzleDate, localIsoDate } from "@/lib/dates";
import { fetchDoubleFeatureDay, guessDoubleFeature } from "@/lib/double-feature/api";
import { QUESTIONS } from "@/lib/double-feature/questions";
import {
  doubleFeatureReducer,
  doubleFeatureShareText,
  initialDoubleFeatureState,
  isFinished,
  isRight,
  scoreOf,
  type AnsweredRound,
  type DoubleFeatureState,
} from "@/lib/double-feature/state";
import type { PublicDoubleFeatureBoard, PublicOption } from "@/lib/double-feature/types";
import { ApiError } from "@/lib/game/api";
import { usePersistentReducer } from "@/lib/game/storage";

const storageKey = (boardId: string) => `double-feature:${boardId}`;

/**
 * Loads one day's board, then plays it; progress is kept on this device.
 * Without a date it is today's board, by the player's own calendar.
 */
export function DoubleFeatureGame({ date }: { date?: string }) {
  const [board, setBoard] = useState<PublicDoubleFeatureBoard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = localIsoDate();
    const ahead = date !== undefined && date > today;
    (ahead ? Promise.reject(new Error("ahead")) : fetchDoubleFeatureDay(date ?? today)).then(
      (loaded) => !cancelled && setBoard(loaded),
      (reason: unknown) =>
        !cancelled &&
        setError(
          ahead
            ? "That day hasn't come yet."
            : reason instanceof ApiError && reason.status === 404
              ? "There's no Double Feature for that day."
              : "Couldn't load the board. Check your connection and try again.",
        ),
    );
    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <main className="mx-auto w-full max-w-[44rem] flex-1 px-4 pb-12">
      <header className="flex items-baseline justify-between gap-4 pt-5">
        <Link href="/" className="text-sm font-semibold text-ink-soft underline underline-offset-4 hover:text-ink">
          &larr; All games
        </Link>
        {board && <p className="text-sm text-ink-soft">{formatPuzzleDate(board.date)}</p>}
      </header>
      <h1 className="mt-3 font-display text-4xl font-[900] uppercase leading-none tracking-[0.01em]">Double Feature</h1>
      {board ? (
        <DoubleFeaturePlay key={board.id} board={board} />
      ) : error ? (
        <p className="mt-8">{error}</p>
      ) : (
        <p className="mt-8 flex items-center gap-2 text-ink-soft">
          <ReelSpinner className="size-5" /> Loading the films&hellip;
        </p>
      )}
      {(board || error) && <DayLinks date={board?.date ?? date ?? localIsoDate()} isToday={date === undefined} />}
    </main>
  );
}

function DayLinks({ date, isToday }: { date: string; isToday: boolean }) {
  const previous = addDays(date, -1);
  return (
    <nav aria-label="Other days" className="mt-8 flex gap-4 text-sm font-semibold">
      {previous >= SITE.prototypeLaunchDate && (
        <Link href={`${SITE.games.doubleFeature}/${previous}`} className="underline underline-offset-4">
          Previous day
        </Link>
      )}
      {!isToday && (
        <Link href={SITE.games.doubleFeature} className="underline underline-offset-4">
          Today
        </Link>
      )}
    </nav>
  );
}

function DoubleFeaturePlay({ board }: { board: PublicDoubleFeatureBoard }) {
  const rounds = board.rounds.length;
  const signature = useMemo(
    () => board.rounds.map((r) => `${r.kind}:${r.options.map((o) => o.title).join("|")}`).join(","),
    [board],
  );
  const reducer = useMemo(() => doubleFeatureReducer(rounds), [rounds]);
  const [state, dispatch] = usePersistentReducer(
    storageKey(board.id),
    signature,
    reducer,
    undefined,
    initialDoubleFeatureState,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const finished = isFinished(state, rounds);
  const round = finished ? null : board.rounds[state.current];
  const answer: AnsweredRound | undefined = state.answers[state.current];

  // Keyboard and screen reader players follow the game: to Next after a reveal, to the question after Next.
  useEffect(() => {
    if (answer) nextRef.current?.focus();
  }, [answer]);
  const onScreen = state.current;
  useEffect(() => {
    if (moved.current) headingRef.current?.focus();
  }, [onScreen]);

  async function pick(option: string) {
    if (busy || answer || finished) return;
    setBusy(true);
    setError(null);
    try {
      const reveal = await guessDoubleFeature(board.id, state.current, option);
      dispatch({ type: "answer", round: state.current, answer: { ...reveal, picked: option } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "That pick couldn't be checked. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    moved.current = true;
    dispatch({ type: "next" });
  }

  if (finished) return <Results board={board} state={state} headingRef={headingRef} />;
  if (!round) return null;
  const question = QUESTIONS[round.kind];

  return (
    <section aria-labelledby="df-question" className="mt-5">
      <RoundDots state={state} rounds={rounds} />
      <h2 id="df-question" ref={headingRef} tabIndex={-1} className="mt-3 text-2xl font-bold leading-tight">
        <span className="sr-only">
          Round {state.current + 1} of {rounds}:{" "}
        </span>
        {question.ask}
      </h2>
      {question.smallPrint && <p className="mt-1 text-sm text-ink-soft">{question.smallPrint}</p>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {round.options.map((option) => (
          <OptionCard
            key={`${state.current}-${option.id}`}
            option={option}
            answer={answer}
            disabled={busy || Boolean(answer)}
            onPick={() => pick(option.id)}
          />
        ))}
      </div>

      <div aria-live="polite" className="mt-4 min-h-6">
        {busy ? (
          <p className="flex items-center gap-2 text-ink-soft">
            <ReelSpinner className="size-4" /> Checking&hellip;
          </p>
        ) : error ? (
          <p className="font-semibold text-marker">{error}</p>
        ) : answer ? (
          <p className="text-lg font-bold">
            {isRight(answer) ? "Right!" : "Not this time."}{" "}
            <span className="font-normal text-ink-soft">
              {round.options.find((o) => o.id === answer.correctOption)?.title} wins.
            </span>
          </p>
        ) : null}
      </div>

      {answer && (
        <button
          ref={nextRef}
          type="button"
          onClick={next}
          className="mt-3 h-12 w-full rounded-xl bg-ink font-semibold text-table hover:bg-ink/85 sm:w-auto sm:px-10"
        >
          {state.current + 1 === rounds ? "See your score" : "Next round"}
        </button>
      )}
    </section>
  );
}

function RoundDots({ state, rounds }: { state: DoubleFeatureState; rounds: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-ink-soft">
        Round {state.current + 1} of {rounds}
      </p>
      <p className="flex gap-1" aria-label={`${state.answers.filter(isRight).length} right so far`}>
        {Array.from({ length: rounds }, (_, i) => {
          const a = state.answers[i];
          return (
            <span
              key={i}
              aria-hidden="true"
              className={`size-3 rounded-full ${
                !a ? "ring-[1.5px] ring-inset ring-ink/30" : isRight(a) ? "bg-ink" : "bg-marker"
              }`}
            />
          );
        })}
      </p>
    </div>
  );
}

function OptionCard({
  option,
  answer,
  disabled,
  onPick,
}: {
  option: PublicOption;
  answer: AnsweredRound | undefined;
  disabled: boolean;
  onPick: () => void;
}) {
  const winner = answer?.correctOption === option.id;
  const picked = answer?.picked === option.id;
  const ring = !answer
    ? "ring-1 ring-ink/15 hover:ring-2 hover:ring-ink"
    : winner
      ? "ring-[3px] ring-ink"
      : picked
        ? "ring-[3px] ring-marker"
        : "ring-1 ring-ink/15 opacity-75";
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      aria-pressed={answer ? picked : undefined}
      className={`flex w-full items-stretch gap-3 rounded-xl bg-surface p-2 text-left transition-shadow ${ring}`}
    >
      <span className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-lg bg-sheet sm:w-32">
        <Image
          key={option.posterUrl}
          src={option.posterUrl}
          alt=""
          fill
          unoptimized
          sizes="(min-width: 640px) 8rem, 6rem"
          className="object-cover"
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-1 py-1">
        <span className="text-lg font-bold leading-tight">{option.title}</span>
        {option.year !== null && <span className="text-sm text-ink-soft">{option.year}</span>}
        {answer && (
          <span className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-3xl font-[900] leading-none">{answer.values[option.id]}</span>
            <span className={`text-sm font-semibold ${winner ? "text-ink" : "text-marker"}`}>
              {[winner && "Winner", picked && "Your pick"].filter(Boolean).join(" · ")}
            </span>
          </span>
        )}
      </span>
    </button>
  );
}

function Results({
  board,
  state,
  headingRef,
}: {
  board: PublicDoubleFeatureBoard;
  state: DoubleFeatureState;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const rounds = board.rounds.length;
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);

  async function share() {
    try {
      await navigator.clipboard.writeText(doubleFeatureShareText(state, rounds, board.date));
      setCopied("yes");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <section aria-labelledby="df-score" className="mt-5">
      <h2 id="df-score" ref={headingRef} tabIndex={-1} className="text-2xl font-bold">
        You scored {scoreOf(state)} out of {rounds * POINTS.doubleFeature.perCorrect}
      </h2>
      <button
        type="button"
        onClick={share}
        className="mt-4 h-12 w-full rounded-xl bg-ink font-semibold text-table hover:bg-ink/85 sm:w-auto sm:px-10"
      >
        {copied === "yes" ? "Copied" : copied === "failed" ? "Couldn't copy" : "Share"}
      </button>
      <ol className="mt-6 flex flex-col gap-3">
        {board.rounds.map((round, i) => {
          const a = state.answers[i];
          if (!a) return null;
          return (
            <li key={i} className="rounded-xl bg-surface p-3 ring-1 ring-ink/10">
              <p className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold">
                  {i + 1}. {QUESTIONS[round.kind].ask}
                </span>
                <span className={`font-bold ${isRight(a) ? "text-ink" : "text-marker"}`}>
                  {isRight(a) ? "Right" : "Wrong"}
                </span>
              </p>
              <ul className="mt-1 text-sm">
                {round.options.map((o) => (
                  <li key={o.id} className={o.id === a.correctOption ? "font-semibold" : "text-ink-soft"}>
                    {o.title}
                    {round.kind === "release" ? "" : ` (${a.years[o.id]})`}: {a.values[o.id]}
                    {o.id === a.picked ? " · your pick" : ""}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
