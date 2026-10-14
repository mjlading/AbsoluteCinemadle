"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch } from "react";

import { RULES } from "@/config/rules";
import { fetchWarmupSolution, guessWarmup } from "@/lib/game/api";
import { currentCardId, foundCount, type WarmupAction, type WarmupState } from "@/lib/game/warmup-state";
import type { PublicWarmupCard, WarmupAnswer } from "@/lib/puzzle/types";
import { FilmLeader } from "./FilmLeader";
import { TitleGuess } from "./TitleGuess";

const TICK_MS = 250;
const LOW_TIME_SECONDS = 10;

type Feedback = { id: number; kind: "found" | "wrong" | "error"; text: string };

const describe = (answer: WarmupAnswer) => `${answer.title}${answer.year ? ` (${answer.year})` : ""}`;

/** Round 1: name films from their foreign titles, translated back word for word, against the clock. */
export function WarmupRound({
  cards,
  apiBase,
  state,
  dispatch,
  onContinue,
}: {
  cards: PublicWarmupCard[];
  apiBase: string;
  state: WarmupState;
  dispatch: Dispatch<WarmupAction>;
  onContinue: () => void;
}) {
  const [now, setNow] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [announcement, setAnnouncement] = useState<Feedback | null>(null);
  const seq = useRef(0);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const { phase, endsAt } = state;
  const cardId = currentCardId(state);
  const card = cardId ? cardsById.get(cardId) : undefined;
  const limitMs = RULES.warmup.timeLimitSeconds * 1000;
  const remainingMs = endsAt === null ? limitMs : Math.max(0, endsAt - (now ?? endsAt - limitMs));
  const secondsLeft = Math.ceil(remainingMs / 1000);

  const say = (text: string) => setAnnouncement({ id: ++seq.current, kind: "found", text });

  // The clock: a coarse tick for the display, and one exact timeout for the end.
  useEffect(() => {
    if (phase !== "playing" || endsAt === null) return;
    const interval = window.setInterval(() => setNow(Date.now()), TICK_MS);
    const timeout = window.setTimeout(() => dispatch({ type: "end" }), Math.max(0, endsAt - Date.now()));
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [phase, endsAt, dispatch]);

  useEffect(() => {
    if (phase === "playing" && secondsLeft === LOW_TIME_SECONDS) {
      setAnnouncement({ id: ++seq.current, kind: "found", text: `${LOW_TIME_SECONDS} seconds left.` });
    }
  }, [phase, secondsLeft]);

  // Round over: fetch the answers the player missed, and move focus to the summary.
  useEffect(() => {
    if (phase !== "over") return;
    summaryRef.current?.focus();
    let cancelled = false;
    fetchWarmupSolution(apiBase).then(
      ({ answers }) => !cancelled && dispatch({ type: "reveal", answers }),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [phase, apiBase, dispatch]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const begin = useCallback(() => dispatch({ type: "begin", now: Date.now() }), [dispatch]);

  async function guess(text: string, tmdbId?: number) {
    if (!cardId || pending) return;
    setPending(true);
    try {
      const result = await guessWarmup(apiBase, cardId, text, tmdbId);
      if (result.correct) {
        dispatch({ type: "found", cardId, answer: result.answer });
        setFeedback({ id: ++seq.current, kind: "found", text: `Yes: ${describe(result.answer)}` });
        say(`Correct: ${describe(result.answer)}.`);
      } else {
        dispatch({ type: "wrong" });
        setFeedback({ id: ++seq.current, kind: "wrong", text: "Not that one." });
        say("Not that one.");
      }
    } catch {
      setFeedback({ id: ++seq.current, kind: "error", text: "Couldn't check that guess. Try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="warmup-heading" className="mt-6">
      <h2 id="warmup-heading" className="sr-only">
        Warm-up
      </h2>

      {phase === "intro" && (
        <div className="flex flex-col items-center rounded-[6px] bg-sheet px-6 py-10 text-center text-white">
          <p className="font-display text-[2.6rem] font-[900] leading-none">Warm-up</p>
          <p className="mt-3 max-w-[26rem] text-white/80">
            {cards.length} films under foreign release titles, translated back word for word. Name as many as you can in{" "}
            {RULES.warmup.timeLimitSeconds} seconds.
          </p>
          <button
            type="button"
            onClick={() => dispatch({ type: "start" })}
            className="mt-6 min-h-12 rounded-full bg-lamp px-7 text-lg font-semibold text-sheet hover:bg-white"
          >
            Start the clock
          </button>
        </div>
      )}

      {phase === "countdown" && (
        <div className="grid place-items-center rounded-[6px] bg-sheet py-8">
          <FilmLeader onDone={begin} />
        </div>
      )}

      {phase === "playing" && card && (
        <div className="flex flex-col gap-4">
          <Progress cards={cards} current={cardId} found={state.found} skipped={state.skipped} />
          <div className="overflow-hidden rounded-[6px] bg-sheet text-white">
            <div
              role="timer"
              aria-label={`${secondsLeft} seconds left`}
              className="flex items-center gap-3 px-4 pt-3 text-sm tabular-nums"
            >
              <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                <span
                  className={`absolute inset-0 origin-left transition-transform duration-250 ease-linear ${
                    secondsLeft <= LOW_TIME_SECONDS ? "bg-marker" : "bg-white/90"
                  }`}
                  style={{ transform: `scaleX(${remainingMs / limitMs})` }}
                />
              </span>
              <span className={secondsLeft <= LOW_TIME_SECONDS ? "font-semibold text-marker" : "text-white/80"}>
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
              </span>
            </div>
            <div key={card.id} className="warmup-card px-5 pb-6 pt-4">
              <p className="text-sm text-white/65">
                {card.languageName}
                {card.countryName && `, ${card.countryName}`}
              </p>
              <p
                lang={card.language}
                className="mt-1 break-words font-display text-[clamp(2rem,9vw,2.8rem)] font-[850] leading-[0.95] text-balance"
              >
                {card.foreignTitle}
              </p>
              <p className="mt-4 text-sm text-white/65">Literally</p>
              <p className="text-xl leading-snug">&ldquo;{card.literalTranslation}&rdquo;</p>
            </div>
          </div>
          <TitleGuess
            key={card.id}
            disabled={pending}
            canSkip={state.queue.length > 1}
            onGuess={guess}
            onSkip={() => dispatch({ type: "skip" })}
          />
          <p aria-hidden="true" className="min-h-6 text-center font-semibold">
            {feedback && (
              <span key={feedback.id} className={feedback.kind === "found" ? "text-ink" : "text-marker"}>
                {feedback.text}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => dispatch({ type: "end" })}
            className="self-center text-sm text-ink-soft underline underline-offset-2"
          >
            End the warm-up
          </button>
        </div>
      )}

      {phase === "over" && (
        <div className="flex flex-col items-center">
          <h3 ref={summaryRef} tabIndex={-1} className="font-display text-[2.2rem] font-[850] leading-none">
            {foundCount(state) === cards.length ? "All found" : `${foundCount(state)} of ${cards.length} found`}
          </h3>
          <ol className="mt-5 flex w-full flex-col gap-2">
            {cards.map((c) => {
              const answer = state.found[c.id] ?? state.revealed[c.id];
              const found = Boolean(state.found[c.id]);
              return (
                <li key={c.id} className="flex items-center gap-3 rounded-[6px] bg-surface p-2.5 ring-1 ring-ink/10">
                  <span className="relative h-[3.75rem] w-10 shrink-0 overflow-hidden rounded-[2px] bg-sheet">
                    {answer?.posterUrl && (
                      <Image src={answer.posterUrl} alt="" fill unoptimized sizes="2.5rem" className="object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink-soft">{c.foreignTitle}</span>
                    <span className="block font-semibold leading-tight">{answer ? describe(answer) : "…"}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      found ? "bg-[var(--tier-1)] text-on-tape" : "bg-ink/10 text-ink-soft"
                    }`}
                  >
                    {found ? "Found" : "Missed"}
                  </span>
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            onClick={onContinue}
            className="mt-6 min-h-12 rounded-full bg-ink px-7 text-lg font-semibold text-table hover:bg-ink/85"
          >
            On to the grid
          </button>
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement && <span key={announcement.id}>{announcement.text}</span>}
      </p>
    </section>
  );
}

/** One small frame per card: found, skipped, on screen or still to come. */
function Progress({
  cards,
  current,
  found,
  skipped,
}: {
  cards: PublicWarmupCard[];
  current: string | null;
  found: Record<string, WarmupAnswer>;
  skipped: string[];
}) {
  const done = Object.keys(found).length;
  return (
    <div className="flex items-center justify-between gap-4">
      <ol aria-label={`${done} of ${cards.length} found`} className="flex gap-1.5">
        {cards.map((c) => (
          <li
            key={c.id}
            aria-hidden="true"
            className={`h-3 w-5 rounded-[2px] border-[1.5px] ${
              found[c.id]
                ? "border-transparent bg-[var(--tier-1)]"
                : c.id === current
                  ? "border-ink bg-ink"
                  : skipped.includes(c.id)
                    ? "border-ink/50 bg-ink/15"
                    : "border-ink/30"
            }`}
          />
        ))}
      </ol>
      <span className="text-sm text-ink-soft">
        {done} of {cards.length} found
      </span>
    </div>
  );
}
