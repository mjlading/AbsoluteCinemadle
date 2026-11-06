import type { CSSProperties } from "react";

import { ClapperHead } from "@/components/soundbytes/ClapperHead";
import { FeltPuppet } from "@/components/soundbytes/FeltPuppet";

/** The speaker cloth Soundbytes boards are made of, for the cards that show the game. */
export const SPEAKER_CLOTH: CSSProperties = {
  backgroundColor: "#a8927a",
  backgroundImage:
    "repeating-linear-gradient(0deg, rgb(60 42 26 / 0.13) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgb(60 42 26 / 0.11) 0 1px, transparent 1px 3px)",
};

/** A felt puppet, a clapperboard and a record, as they sit on a board: an illustration, not film audio. */
export function SoundbytesArtwork({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`relative aspect-[150/128] ${className}`}>
      <svg viewBox="0 0 150 128" className="absolute inset-0 size-full" focusable="false">
        <g transform="rotate(-4 118 92)">
          <circle cx="119.5" cy="95" r="22" fill="#000" opacity="0.28" />
          <circle cx="118" cy="92" r="22" fill="#1d2026" />
          {[0.86, 0.72, 0.58].map((f) => (
            <circle key={f} cx="118" cy="92" r={22 * f} fill="none" stroke="#2c3039" strokeWidth="1.4" />
          ))}
          <circle cx="118" cy="92" r="9.6" fill="var(--tier-2)" />
          <circle cx="118" cy="92" r="1.6" fill="#1d2026" />
          <rect x="100.4" y="110" width="35.2" height="8" fill="#edebe3" />
          <circle cx="118" cy="72" r="3.2" fill="#d92b3f" />
        </g>
      </svg>
      <div className="absolute left-[2%] top-[16%] w-[48%] -rotate-3">
        <FeltPuppet slot={0} uid="card-puppet" />
      </div>
      <div className="absolute right-[6%] top-[0%] w-[32%] rotate-6">
        <ClapperHead slot={2} uid="card-clapper" />
      </div>
    </div>
  );
}
