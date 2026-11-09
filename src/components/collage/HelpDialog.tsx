"use client";

import type { ReactNode } from "react";

import { Dialog } from "@/components/ui/Dialog";
import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const inWords = (n: number) => NUMBER_WORDS[n] ?? String(n);
const capitalised = (s: string) => s[0].toUpperCase() + s.slice(1);

/** The only rules text in the game: three short lines, opened by the `?` button and on a first visit. */
export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tilesPerCollage, keywordsPerPuzzle } = RULES.closeUps;
  const bonus = POINTS.closeUps.firstClueBonus;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="closeups-help-title"
      className="closeups-rise max-w-[22.5rem] rounded-[18px] bg-surface text-ink"
    >
      <h2 id="closeups-help-title" className="font-display text-[2rem] font-[900] leading-[0.9]">
        How to play
      </h2>
      <ul className="mt-4 grid gap-3.5">
        <Line
          tone="bg-ink/8"
          icon={<span className="closeups-tape bg-[var(--tier-4)] px-1 py-1.5 text-[9px] text-on-tape">Hands</span>}
        >
          Name the film from {inWords(tilesPerCollage)} close-ups that share one keyword.
        </Line>
        <Line
          tone="bg-ink/8"
          icon={
            <svg viewBox="0 0 12 12" aria-hidden="true" className="closeups-cross size-4">
              <path pathLength={1} d="M2.2 2.4 C4.5 4.8 7 7.2 9.8 9.6" />
              <path pathLength={1} d="M9.8 2.2 C7.4 4.6 5 7 2.2 9.8" />
            </svg>
          }
        >
          Every miss or skip opens the next keyword. {capitalised(inWords(keywordsPerPuzzle))} in all.
        </Line>
        <Line tone="bg-[var(--tier-2)] text-on-tape text-[13px]" icon={`+${bonus}`}>
          Points are the guesses you have left, +{bonus} for the first clue.
        </Line>
      </ul>
      <button
        type="button"
        onClick={onClose}
        className="mt-5 h-12 w-full rounded-xl bg-ink font-semibold text-table hover:bg-ink/85"
      >
        Let&apos;s go
      </button>
    </Dialog>
  );
}

function Line({ icon, tone, children }: { icon: ReactNode; tone: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[2.25rem_1fr] items-center gap-3 leading-snug">
      <span
        aria-hidden="true"
        className={`grid size-9 place-items-center rounded-[10px] font-condensed font-extrabold uppercase leading-none tracking-[0.04em] ${tone}`}
      >
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}
