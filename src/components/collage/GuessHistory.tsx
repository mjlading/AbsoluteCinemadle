import type { CollageState } from "@/lib/collage/state";

/**
 * The player's misses as small chips struck through in red marker; skips read
 * "Skipped". Each chip carries its guess's index, so a repeat can pulse it.
 */
export function GuessHistory({ guesses }: { guesses: CollageState["guesses"] }) {
  // Before the first miss there is nothing to list, but the row keeps its height so the layout holds still.
  if (!guesses.some((guess) => !guess.correct)) return <div aria-hidden="true" className="h-[30px]" />;
  return (
    <ul aria-label="Your guesses" className="flex h-[30px] items-center justify-center gap-1.5 overflow-hidden">
      {guesses.map((guess, index) =>
        guess.correct ? null : (
          <li
            key={index}
            data-guess={index}
            data-miss={guess.text !== null || undefined}
            title={guess.text ?? undefined}
            className={`closeups-chip relative min-w-0 max-w-[46%] truncate rounded-full bg-ink/7 px-2.5 py-[7px] text-sm leading-none text-ink-soft ${
              guess.text === null ? "font-medium italic" : "font-semibold"
            }`}
          >
            {guess.text ?? "Skipped"}
          </li>
        ),
      )}
    </ul>
  );
}
