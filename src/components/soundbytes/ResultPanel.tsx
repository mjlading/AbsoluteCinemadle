"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { SITE } from "@/config/site";
import { soundbytesTitle } from "@/lib/soundbytes/day";
import { lineMarks, wonOnLine, type SoundbytesState } from "@/lib/soundbytes/state";
import type { PublicSoundbytesBoard } from "@/lib/soundbytes/types";

/** The share text: the day's number and the line the film was named on, then one square per line. */
export function soundbytesShareText(board: PublicSoundbytesBoard, state: SoundbytesState): string {
  const squares = lineMarks(board, state)
    .map((mark) => (mark === "spent" ? "🟥" : mark === "won" ? "🟩" : "⬛"))
    .join("");
  const result = state.status === "won" ? wonOnLine(state) : "X";
  return `${soundbytesTitle(board.date)} ${result}/${board.nodes.length}\n${squares}`;
}

/** Takes the guess row's place once the game is over: the film, the line it was named on, Share and the way on. */
export function ResultPanel({ board, state }: { board: PublicSoundbytesBoard; state: SoundbytesState }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);
  const { answer } = state;
  const won = state.status === "won";
  const line = wonOnLine(state);

  // The guess box this replaces had focus, so focus moves to the film's name.
  useEffect(() => headingRef.current?.focus({ preventScroll: true }), []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function share() {
    try {
      await navigator.clipboard.writeText(soundbytesShareText(board, state));
      setCopied("yes");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <section aria-labelledby="sb-result" className="closeups-rise flex flex-col gap-3">
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
            {won ? (line === 1 ? "First line!" : "Got it") : "It was"}
          </p>
          <h2
            id="sb-result"
            ref={headingRef}
            tabIndex={-1}
            className="mt-1.5 line-clamp-2 font-display text-2xl font-[900] leading-[0.95] text-balance outline-none"
          >
            {answer?.title ?? "…"}
          </h2>
          {(answer?.year || answer?.themeUrl) && (
            <p className="mt-1 flex gap-2 text-sm font-semibold leading-none text-ink-soft">
              {answer.year && <span>{answer.year}</span>}
              {answer.themeUrl && (
                <a
                  href={answer.themeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-ink"
                >
                  Theme on Apple Music
                </a>
              )}
            </p>
          )}
        </div>
        <div
          className="shrink-0 text-right"
          role="img"
          aria-label={won ? `Named on line ${line} of ${board.nodes.length}` : "Not named"}
        >
          <p
            data-testid="result"
            className={`font-display text-[52px] font-[900] leading-[0.85] tabular-nums ${won ? "" : "text-ink-soft"}`}
          >
            {won ? line : "X"}
            <span className="text-[26px] text-ink-soft">/{board.nodes.length}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={share}
          className="h-12 flex-1 rounded-xl bg-ink font-semibold text-table transition-colors hover:bg-ink/85"
        >
          {copied === "yes" ? "Copied" : copied === "failed" ? "Couldn't copy" : "Share"}
        </button>
        <Link
          href={SITE.games.soundbytesArchive}
          className="grid h-12 flex-1 place-items-center rounded-xl bg-ink/7 font-condensed text-[17px] font-extrabold tracking-[0.02em] transition-colors hover:bg-ink/12"
        >
          Previous days
        </Link>
      </div>
    </section>
  );
}
