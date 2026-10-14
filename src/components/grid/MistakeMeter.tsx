import { RULES } from "@/config/rules";

/** Mistakes left, drawn as a short strip of film whose sprocket holes get marked red. */
export function MistakeMeter({ mistakes }: { mistakes: number }) {
  const max = RULES.grid.maxMistakes;
  const left = max - mistakes;
  return (
    <div className="flex items-center gap-2.5 text-[0.95rem] text-ink-soft">
      <span>Mistakes left</span>
      <span
        role="img"
        aria-label={`${left} of ${max}`}
        className="flex items-center gap-[5px] rounded-[3px] bg-ink px-1.5 py-[5px]"
      >
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={`h-[9px] w-3 rounded-[2px] transition-colors duration-300 ${i < left ? "bg-table" : "bg-marker"}`}
          />
        ))}
      </span>
    </div>
  );
}
