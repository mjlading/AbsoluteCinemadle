/*
 * The pink slip, Casting call's firing notice, drawn like the home page's game
 * icons (src/components/game-modes/GameIcons.tsx): bold ink outlines, a paper
 * fill (pink, for once) and one red accent, a wax-seal stamp with a cross.
 */

const INK = "#181b21";
const SLIP = "#ffc4d2";
const PAPER = "#fbfaf6";
const RED = "#d92b3f";
const line = { stroke: INK, strokeWidth: 2.6, strokeLinejoin: "round", strokeLinecap: "round" } as const;

export function PinkSlip({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <g transform="rotate(-8 22 24)">
        {/* The notice, its top corner folded down. */}
        <path d="M8 5h20l8 8v30H8Z" fill={SLIP} {...line} />
        <path d="M28 5v8h8" fill={PAPER} {...line} />
        <path d="M13 14h9M13 20h16M13 26h13M13 32h8" fill="none" {...line} strokeWidth={2.2} />
      </g>
      {/* The stamp. */}
      <circle cx="34" cy="35" r="9.5" fill={RED} stroke={INK} strokeWidth="2.6" />
      <path d="M30.5 31.5l7 7M37.5 31.5l-7 7" stroke={PAPER} strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}
