import type { Ref } from "react";

import { AbsoluteCinemaFigure } from "@/components/game/AbsoluteCinema";
import { Confetti } from "@/components/game/Confetti";
import { RULES } from "@/config/rules";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * The end of the grid round. A win gets confetti; a perfect win (no mistakes)
 * also gets the spotlight moment the game is named after.
 */
export function RoundSummary({
  won,
  mistakes,
  flips,
  headingRef,
}: {
  won: boolean;
  mistakes: number;
  flips: number;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const perfect = won && mistakes === 0;
  return (
    <div className="mt-6 flex flex-col items-center text-center">
      {won && <Confetti />}
      {perfect && <AbsoluteCinemaFigure animated className="h-36 w-36 text-ink" />}
      <h3 ref={headingRef} tabIndex={-1} className="font-display text-[2.2rem] font-[850] leading-none">
        {perfect ? "Absolute cinema." : won ? `You found all ${RULES.grid.groupCount} films` : "Out of mistakes"}
      </h3>
      <p className="mt-2 text-ink-soft">
        {won
          ? `${perfect ? `All ${RULES.grid.groupCount} films, no mistakes` : plural(mistakes, "mistake")}, ${plural(flips, "label")} revealed.`
          : "Here are today's films."}
      </p>
    </div>
  );
}
