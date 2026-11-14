"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import { POINTS } from "@/config/scoring";
import { ResultActions } from "@/components/game/ResultActions";
import { SITE } from "@/config/site";
import { collageScore, currentRound, isFirstClueWin, maxCollageScore, type CollageState } from "@/lib/collage/state";
import { closeUpsTitle } from "@/lib/collage/day";
import type { PublicCollagePuzzle } from "@/lib/collage/types";

/** The share text: the day's number and score, then one square per keyword (used, solved, not reached). */
export function collageShareText(puzzle: PublicCollagePuzzle, state: CollageState): string {
  const round = currentRound(state);
  const squares = puzzle.keywords
    .map((_, i) => (state.status !== "won" || i < round ? "🟥" : i === round ? "🟩" : "⬛"))
    .join("");
  return `${closeUpsTitle(puzzle.date)} ${collageScore(state)}/${maxCollageScore()}\n${squares}`;
}

/** Takes the guess row's place once the game is over: the film, the score, Share and the way on. */
export function ResultPanel({ puzzle, state }: { puzzle: PublicCollagePuzzle; state: CollageState }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { answer } = state;
  const won = state.status === "won";
  const firstClue = isFirstClueWin(state);
  const score = collageScore(state);

  // The guess box this replaces had focus, so focus moves to the film's name.
  useEffect(() => headingRef.current?.focus({ preventScroll: true }), []);

  return (
    <section aria-labelledby="closeups-result" className="closeups-rise flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {answer?.posterUrl ? (
          <Image
            src={answer.posterUrl}
            alt=""
            width={46}
            height={69}
            unoptimized
            className="h-[69px] w-[46px] shrink-0 rounded-[4px] object-cover shadow-[0_6px_14px_-6px_rgb(0_0_0/0.6)]"
          />
        ) : (
          <span aria-hidden="true" className="h-[69px] w-[46px] shrink-0 rounded-[4px] bg-ink/10" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-none text-ink-soft">
            {won ? (firstClue ? "First clue!" : "Got it") : "It was"}
          </p>
          <h2
            id="closeups-result"
            ref={headingRef}
            tabIndex={-1}
            className="mt-1.5 line-clamp-2 font-display text-2xl font-[900] leading-[0.95] text-balance"
          >
            {answer?.title ?? "…"}
          </h2>
          {answer?.year && <p className="mt-1 text-sm font-semibold leading-none text-ink-soft">{answer.year}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p
            data-testid="score"
            className={`font-display text-[52px] font-[900] leading-[0.85] tabular-nums ${score ? "" : "text-ink-soft"}`}
          >
            {score}
          </p>
          {firstClue ? (
            <p className="mt-1 inline-block rounded-[3px] bg-[var(--tier-2)] px-1.5 py-1 font-condensed text-xs font-extrabold uppercase leading-none tracking-[0.06em] text-on-tape">
              +{POINTS.closeUps.firstClueBonus} first clue
            </p>
          ) : (
            <p className="mt-1.5 text-xs font-semibold leading-none text-ink-soft">
              {score === 1 ? "point" : "points"}
            </p>
          )}
        </div>
      </div>
      <ResultActions shareText={() => collageShareText(puzzle, state)} archiveHref={SITE.games.closeUpsArchive} />
    </section>
  );
}
