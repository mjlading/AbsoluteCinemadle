"use client";

import type { ReactNode } from "react";

import { Dialog } from "@/components/ui/Dialog";
import { RULES } from "@/config/rules";
import { HEAT } from "@/lib/warmer/heat";

/** The only rules text in the game: three short lines, opened by the `?` button and on a first visit. */
export function HelpDialog({ open, total, onClose }: { open: boolean; total: number; onClose: () => void }) {
  const { decade, genres } = RULES.warmer.clueAfter;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="warmer-help-title"
      className="closeups-rise max-w-[22.5rem] rounded-[18px] bg-surface text-ink"
    >
      <h2 id="warmer-help-title" className="font-display text-[2rem] font-[900] leading-[0.9]">
        How to play
      </h2>
      <ul className="mt-4 grid gap-3.5">
        <Line tone="bg-ink/8" icon="?">
          One film is hidden. Guess any film to see its rank: #1 is the hidden film, #{total.toLocaleString("en-GB")}{" "}
          the least like it.
        </Line>
        <Line
          tone="bg-sheet"
          icon={
            <span className="grid gap-[2px]">
              {[HEAT[0], HEAT[2], HEAT[4]].map((step) => (
                <span key={step.key} className="h-[5px] w-5 rounded-[1.5px]" style={{ background: step.color }} />
              ))}
            </span>
          }
        >
          Films rank close when they share themes, genres, era and audience.
        </Line>
        <Line tone="bg-[var(--tier-2)] text-on-tape" icon={<Bulb className="size-5" />}>
          Stuck? A hint lands halfway to the answer. Clues open after {decade} and {genres} guesses.
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
        className={`grid size-9 place-items-center rounded-[10px] font-display text-xl font-[900] leading-none ${tone}`}
      >
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}

export function Bulb({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 17.5h6M10 21h4M8.2 14.3a6.5 6.5 0 117.6 0c-.6.5-.8 1-.8 1.7H9c0-.7-.2-1.2-.8-1.7z" />
    </svg>
  );
}
