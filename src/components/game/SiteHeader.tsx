"use client";

import { useState } from "react";

import { CloseButton, Dialog } from "@/components/ui/Dialog";
import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";
import { formatPuzzleDate } from "@/lib/dates";

export function SiteHeader({ date }: { date: string | null }) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-[2.6rem] font-[900] leading-[0.85] tracking-[-0.01em]">Absolute Cinemadle</h1>
        <p className="mt-1.5 min-h-6 text-ink-soft">{date && formatPuzzleDate(date)}</p>
      </div>
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full border-[1.5px] border-ink font-display text-2xl font-[850] hover:bg-ink/5"
        aria-label="How to play"
      >
        ?
      </button>
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </header>
  );
}

function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { groupCount, groupSize, maxMistakes } = RULES.grid;
  return (
    <Dialog open={open} onClose={onClose} labelledBy="help-title" className="max-w-md bg-surface text-ink">
      <div className="flex items-start justify-between gap-4">
        <h2 id="help-title" className="font-display text-3xl font-[850] leading-none">
          How to play
        </h2>
        <CloseButton onClick={onClose} />
      </div>
      <ul className="mt-4 list-disc space-y-2 pl-5 leading-snug text-pretty">
        <li>
          The grid hides {groupCount} films, each with {groupSize} frames: actors, stills, empty sets and prop
          close-ups.
        </li>
        <li>Select {groupSize} frames you think come from the same film, then submit.</li>
        <li>&ldquo;One away&rdquo; means three of your four are right.</li>
        <li>You can make {maxMistakes} mistakes before the round ends.</li>
        <li>
          Press and hold a frame, or use its magnifier, to see it larger. From there you can reveal its label for{" "}
          {Math.abs(POINTS.grid.perFlip)} points.
        </li>
        <li>On a keyboard, arrow keys move between frames, Space selects and I opens the larger view.</li>
      </ul>
    </Dialog>
  );
}
