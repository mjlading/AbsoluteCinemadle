"use client";

import type { ReactNode } from "react";

import { Dialog } from "@/components/ui/Dialog";
import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";
import { BANDS } from "./RatingsChart";

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const inWords = (n: number) => NUMBER_WORDS[n] ?? String(n);
const capitalised = (s: string) => s[0].toUpperCase() + s.slice(1);

/** The only rules text in the game: three short lines, opened by the `?` button and on a first visit. */
export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { rounds, options } = RULES.ratingsCliff;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="rc-help-title"
      className="closeups-rise max-w-[22.5rem] rounded-[18px] bg-surface text-ink"
    >
      <h2 id="rc-help-title" className="font-display text-[2rem] font-[900] leading-[0.9]">
        How to play
      </h2>
      <ul className="mt-4 grid gap-3.5">
        <Line
          tone="bg-sheet"
          icon={
            <span className="grid grid-cols-2 gap-[2px]">
              {[BANDS[0], BANDS[3], BANDS[1], BANDS[5]].map((b) => (
                <span key={b.fill} className="size-2 rounded-[1.5px]" style={{ background: b.fill }} />
              ))}
            </span>
          }
        >
          Each square is one episode of a TV series, coloured by its rating. A column is a season.
        </Line>
        <Line tone="bg-ink/8" icon={String(options)}>
          Pick the series from {inWords(options)} names. {capitalised(inWords(rounds))} series a day.
        </Line>
        <Line tone="bg-[var(--tier-2)] text-on-tape" icon={`+${POINTS.ratingsCliff.perCorrect}`}>
          A point for each one you get right.
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
        className={`grid size-9 place-items-center rounded-[10px] font-condensed text-[15px] font-extrabold leading-none ${tone}`}
      >
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}
