"use client";

import type { ReactNode } from "react";

import { Dialog } from "@/components/ui/Dialog";
import { RULES } from "@/config/rules";
import { HeadphonesIcon, PersonIcon } from "./icons";

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const inWords = (n: number) => NUMBER_WORDS[n] ?? String(n);
const capitalised = (s: string) => s[0].toUpperCase() + s.slice(1);

/** The only rules text in the game: three short lines, opened by the `?` button and on a first visit. */
export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lines } = RULES.soundbytes;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="sb-help-title"
      className="closeups-rise max-w-[22.5rem] rounded-[18px] bg-surface text-ink"
    >
      <h2 id="sb-help-title" className="font-display text-[2rem] font-[900] leading-[0.9]">
        How to play
      </h2>
      <ul className="mt-4 grid gap-3.5">
        <Line tone="bg-ink/8" icon={<HeadphonesIcon className="size-5" />}>
          Name the film from lines of its dialogue. Sound on.
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
          Every miss or skip opens the next line. {capitalised(inWords(lines))} in all.
        </Line>
        <Line tone="bg-[var(--tier-1)] text-on-tape" icon={<PersonIcon className="size-5" />}>
          An actor from the film is a free hint, pinned to the board.
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
      <span aria-hidden="true" className={`grid size-9 place-items-center rounded-[10px] ${tone}`}>
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}
