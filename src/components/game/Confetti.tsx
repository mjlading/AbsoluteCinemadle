import type { CSSProperties } from "react";

import { seededRandom } from "@/lib/random";

const PIECES = 46;

/*
 * Confetti in the site's own vocabulary: torn bits of tier-colored tape and a
 * few tiny film frames. Positions come from a fixed seed, so rendering stays pure.
 */
const random = seededRandom("absolute-cinemadle-confetti");
const pieces = Array.from({ length: PIECES }, (_, i) => {
  const film = i % 7 === 0;
  return {
    film,
    color: `var(--tier-${(i % 4) + 1})`,
    left: random() * 100,
    drift: (random() - 0.5) * 140,
    spin: (random() - 0.5) * 900,
    delay: random() * 260,
    duration: 1300 + random() * 900,
    width: film ? 14 : 6 + random() * 8,
    height: film ? 11 : 10 + random() * 10,
  };
});

/** A one-off burst over the whole viewport; it removes nothing and needs no cleanup, as it ends invisible. */
export function Confetti() {
  return (
    <div aria-hidden="true" className="confetti pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((piece, i) => (
        <span
          key={i}
          className={piece.film ? "confetti-piece confetti-film" : "confetti-piece"}
          style={
            {
              left: `${piece.left}%`,
              width: piece.width,
              height: piece.height,
              background: piece.film ? undefined : piece.color,
              "--drift": `${piece.drift}px`,
              "--spin": `${piece.spin}deg`,
              animationDelay: `${piece.delay}ms`,
              animationDuration: `${piece.duration}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
