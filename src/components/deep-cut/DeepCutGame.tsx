"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";
import { SITE } from "@/config/site";
import { addDays, localIsoDate } from "@/lib/dates";
import { fetchDeepCutDay, guessDeepCut, revealDeepCut } from "@/lib/deep-cut/api";
import {
  alreadyMissed,
  deepCutReducer,
  deepCutShareText,
  initialDeepCutState,
  isOver,
  maxTotal,
  needsReveal,
  placing,
  scoreOf,
  totalScore,
  triesLeft,
  type DeepCutState,
  type PromptState,
} from "@/lib/deep-cut/state";
import type { DeepCutReveal, Misfit, PublicDeepCutBoard } from "@/lib/deep-cut/types";
import { ApiError, type FilmSuggestion } from "@/lib/game/api";
import { usePersistentReducer } from "@/lib/game/storage";
import { FilmSearch } from "./FilmSearch";

const MAX = POINTS.deepCut.max;
const TRIES = RULES.deepCut.triesPerPrompt;

/** Loads one day's prompts (today's by the player's calendar when no date is given), then plays them. */
export function DeepCutGame({ date }: { date?: string }) {
  const [board, setBoard] = useState<PublicDeepCutBoard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = localIsoDate();
    const ahead = date !== undefined && date > today;
    (ahead ? Promise.reject(new Error("ahead")) : fetchDeepCutDay(date ?? today)).then(
      (loaded) => !cancelled && setBoard(loaded),
      (reason: unknown) =>
        !cancelled &&
        setError(
          ahead
            ? "That day hasn't come yet."
            : reason instanceof ApiError && reason.status === 404
              ? "There's no Deep Cut for that day."
              : "Couldn't load the prompts. Check your connection and try again.",
        ),
    );
    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <>
      <header className="mx-auto flex w-full max-w-[36rem] items-center gap-3 px-4 py-4">
        <Link
          href="/"
          className="rounded-lg px-2 py-1 font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ink"
        >
          &larr; Home
        </Link>
        <h1 className="font-display text-2xl font-extrabold uppercase">Deep Cut</h1>
      </header>
      <main className="mx-auto w-full max-w-[36rem] flex-1 px-4 pb-12">
        {board ? (
          <DeepCutPlay key={board.id} board={board} />
        ) : (
          <p className="pt-12 text-center text-ink-soft">{error ?? "Picking today's prompts…"}</p>
        )}
      </main>
    </>
  );
}

type Feedback = { id: number; text: string } | null;

const missText = (title: string, why: Misfit) =>
  why === "documentary"
    ? `${title} is a documentary; they don't count here.`
    : why === "short"
      ? `${title} is a short; only feature films count.`
      : `${title} doesn't fit.`;

function DeepCutPlay({ board }: { board: PublicDeepCutBoard }) {
  const signature = useMemo(() => board.prompts.map((p) => p.text).join("|"), [board]);
  const [state, dispatch] = usePersistentReducer(
    `deep-cut:${board.id}`,
    signature,
    deepCutReducer,
    board.prompts.length,
    initialDeepCutState,
  );
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const index = state.current;
  const prompt = state.prompts[index];
  const over = isOver(state);

  async function reveal(at: number) {
    setBusy(true);
    try {
      const answers = await revealDeepCut(board.id, at);
      dispatch({ type: "settle", prompt: at, outcome: { kind: "out", ...answers } });
    } catch {
      setFeedback({ id: Date.now(), text: "The answers couldn't be loaded. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function submit(choice: FilmSuggestion) {
    if (!prompt || prompt.outcome || busy || triesLeft(prompt) === 0) return;
    const at = index;
    if (alreadyMissed(prompt, choice.tmdbId)) {
      setFeedback({ id: Date.now(), text: `You already tried ${choice.title}.` });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const result = await guessDeepCut(board.id, at, choice.tmdbId, prompt.misses.length);
      if (result.fits) {
        const { film, score, percentile, mostObvious, deepCut } = result;
        dispatch({
          type: "settle",
          prompt: at,
          outcome: { kind: "fit", film, score, percentile, mostObvious, deepCut },
        });
      } else {
        dispatch({ type: "miss", prompt: at, film: result.film, why: result.why });
        setFeedback({ id: Date.now(), text: missText(result.film.title, result.why) });
        if (result.triesLeft === 0 || prompt.misses.length + 1 >= TRIES) {
          setBusy(false);
          await reveal(at);
          return;
        }
      }
    } catch (error) {
      setFeedback({
        id: Date.now(),
        text: error instanceof ApiError ? error.message : "That film couldn't be checked. Try again.",
      });
    }
    setBusy(false);
  }

  const previousDay = addDays(board.date, -1);
  const hasPrevious = previousDay >= SITE.prototypeLaunchDate;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-ink-soft">
        Name a film that fits each prompt. The less obvious your film, the more it scores, up to {MAX}. A film that
        doesn&rsquo;t fit uses one of your {TRIES} tries.
      </p>

      {over ? (
        <Summary board={board} state={state} />
      ) : (
        prompt && (
          <section
            aria-labelledby="dc-prompt"
            className="flex flex-col gap-4 rounded-xl bg-surface p-4 ring-1 ring-ink/10"
          >
            <div className="flex items-center justify-between gap-3 text-sm text-ink-soft">
              <span>
                Prompt {index + 1} of {board.prompts.length}
              </span>
              {!prompt.outcome && <Tries left={triesLeft(prompt)} />}
            </div>
            <h2 id="dc-prompt" className="font-display text-3xl leading-tight font-extrabold">
              {board.prompts[index].text}
            </h2>

            {prompt.outcome ? (
              <RevealPanel prompt={prompt} />
            ) : needsReveal(prompt) ? (
              <button
                type="button"
                onClick={() => reveal(index)}
                disabled={busy}
                className="min-h-12 rounded-full bg-ink px-5 font-semibold text-table hover:opacity-90 disabled:opacity-60"
              >
                Show the answers
              </button>
            ) : (
              <FilmSearch busy={busy} onPick={submit} label={`A film for: ${board.prompts[index].text}`} />
            )}

            <p aria-live="polite" className={`text-sm ${prompt.outcome ? "" : "min-h-6"}`}>
              {busy ? (
                <span className="text-ink-soft">Checking&hellip;</span>
              ) : feedback && !prompt.outcome ? (
                <span key={feedback.id} className="font-semibold text-marker">
                  {feedback.text}
                </span>
              ) : null}
            </p>

            {prompt.misses.length > 0 && (
              <ul aria-label="Films that didn't fit" className="flex flex-col gap-1 text-sm text-ink-soft">
                {prompt.misses.map((m) => (
                  <li key={m.tmdbId}>
                    <span className="line-through decoration-marker decoration-2">{m.title}</span>
                    {m.year && ` (${m.year})`}
                  </li>
                ))}
              </ul>
            )}

            {prompt.outcome && (
              <button
                type="button"
                autoFocus
                onClick={() => {
                  setFeedback(null);
                  dispatch({ type: "next" });
                }}
                className="min-h-12 rounded-full bg-ink px-5 text-lg font-semibold text-table hover:opacity-90"
              >
                {index + 1 < board.prompts.length ? "Next prompt" : "See your total"}
              </button>
            )}
          </section>
        )
      )}

      {hasPrevious && (
        <Link
          href={`${SITE.games.deepCut}/${previousDay}`}
          className="self-start rounded font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ink"
        >
          Previous day
        </Link>
      )}
    </div>
  );
}

function Tries({ left }: { left: number }) {
  return (
    <span className="flex items-center gap-1.5" aria-label={`${left} of ${TRIES} tries left`}>
      {Array.from({ length: TRIES }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`size-3 rounded-full ${i < left ? "bg-ink" : "ring-[1.5px] ring-ink/30 ring-inset"}`}
        />
      ))}
    </span>
  );
}

function RevealPanel({ prompt }: { prompt: PromptState }) {
  const outcome = prompt.outcome;
  if (!outcome) return null;
  return (
    <div className="flex flex-col gap-3">
      {outcome.kind === "fit" ? (
        <div>
          <p>
            <span className="font-semibold">{outcome.film.title}</span>
            {outcome.film.year && <span className="text-ink-soft"> ({outcome.film.year})</span>} fits.
          </p>
          <p className="mt-1 font-display text-5xl font-extrabold">
            {outcome.score}
            <span className="text-2xl text-ink-soft"> / {MAX}</span>
          </p>
          <p className="mt-1">{placing(outcome.score, outcome.percentile)}</p>
        </div>
      ) : (
        <p className="font-semibold">
          Out of tries: <span className="text-marker">0 points</span>.
        </p>
      )}
      <Answers reveal={outcome} />
    </div>
  );
}

function Answers({ reveal }: { reveal: DeepCutReveal }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-lg bg-ink/5 p-3 text-sm">
      <dt className="text-ink-soft">Most obvious</dt>
      <dd>
        <span className="font-semibold">{reveal.mostObvious.title}</span>
        {reveal.mostObvious.year && ` (${reveal.mostObvious.year})`}, worth {reveal.mostObvious.score}
      </dd>
      <dt className="text-ink-soft">A deep cut</dt>
      <dd>
        <span className="font-semibold">{reveal.deepCut.title}</span>
        {reveal.deepCut.year && ` (${reveal.deepCut.year})`}, worth {reveal.deepCut.score}
      </dd>
    </dl>
  );
}

function Summary({ board, state }: { board: PublicDeepCutBoard; state: DeepCutState }) {
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);
  const texts = board.prompts.map((p) => p.text);

  async function share() {
    try {
      await navigator.clipboard.writeText(
        deepCutShareText(board.date, texts, state, `${SITE.url}${SITE.games.deepCut}`),
      );
      setCopied("yes");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <section aria-labelledby="dc-total" className="flex flex-col gap-4 rounded-xl bg-surface p-4 ring-1 ring-ink/10">
      <h2 id="dc-total" className="font-display text-4xl font-extrabold">
        {totalScore(state)}
        <span className="text-2xl text-ink-soft"> / {maxTotal(texts.length)}</span>
      </h2>
      <ol className="flex flex-col gap-3">
        {state.prompts.map((p, i) => (
          <li key={i} className="flex flex-col gap-1 border-t border-ink/10 pt-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">{texts[i]}</span>
              <span className="font-display text-xl font-extrabold">{scoreOf(p)}</span>
            </div>
            <p className="text-sm text-ink-soft">
              {p.outcome?.kind === "fit"
                ? `You named ${p.outcome.film.title}${p.outcome.film.year ? ` (${p.outcome.film.year})` : ""}. `
                : "No film that fit. "}
              Most obvious: {p.outcome?.mostObvious.title}. A deep cut: {p.outcome?.deepCut.title}
              {p.outcome?.deepCut.year ? ` (${p.outcome.deepCut.year})` : ""}.
            </p>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={share}
        className="min-h-12 rounded-full bg-ink px-5 text-lg font-semibold text-table hover:opacity-90"
      >
        {copied === "yes" ? "Copied" : copied === "failed" ? "Couldn't copy" : "Share"}
      </button>
    </section>
  );
}
