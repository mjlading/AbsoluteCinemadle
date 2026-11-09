/*
 * The home page's game icons, drawn as one set: bold ink outlines, white
 * fills and one red accent, on the card's own color.
 */

const INK = "#181b21";
const PAPER = "#fbfaf6";
const RED = "#d92b3f";
const line = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: "round", strokeLinecap: "round" } as const;

/** Four close-ups in a 2x2 sheet, and the Enhance magnifier over them. */
export function CloseUpsIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true" focusable="false">
      <g transform="rotate(-6 44 44)">
        <rect x="10" y="10" width="68" height="68" rx="9" fill={INK} />
        {[
          [15, 15],
          [46, 15],
          [15, 46],
          [46, 46],
        ].map(([x, y]) => (
          <rect key={`${x}${y}`} x={x} y={y} width="27" height="27" rx="4" fill={PAPER} />
        ))}
      </g>
      <circle cx="66" cy="66" r="15" fill={PAPER} {...line} />
      <path d="M77 77l11 11" {...line} strokeWidth={6} />
      <path d="M60 66h12M66 60v12" stroke={RED} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

/** Two headshots on a sheet, the front one crossed off in red marker. */
export function CastingCallIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true" focusable="false">
      <g transform="rotate(8 62 44)">
        <rect x="42" y="12" width="40" height="50" rx="6" fill={PAPER} {...line} />
        <circle cx="62" cy="30" r="8" fill="none" {...line} />
        <path d="M49 58c2-9 7-12 13-12s11 3 13 12" fill="none" {...line} />
      </g>
      <g transform="rotate(-6 36 56)">
        <rect x="14" y="30" width="44" height="54" rx="6" fill={PAPER} {...line} />
        <circle cx="36" cy="50" r="9" fill="none" {...line} />
        <path d="M21 80c2-10 8-14 15-14s13 4 15 14" fill="none" {...line} />
      </g>
      <path
        d="M12 34c14 14 30 30 48 46M58 32C44 48 30 62 14 80"
        stroke={RED}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** A speaker sending out sound, one wave in red. */
export function SoundbytesIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true" focusable="false">
      <path d="M14 38h14l20-16v52L28 58H14Z" fill={PAPER} {...line} />
      <path d="M58 38c5 6 5 14 0 20" fill="none" stroke={RED} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M67 29c10 11 10 27 0 38" fill="none" {...line} strokeWidth={4.5} />
      <path d="M76 20c15 16 15 40 0 56" fill="none" {...line} strokeWidth={4.5} />
    </svg>
  );
}

/** One raised open hand, the meme's gesture, thumb on the left; `mirror` puts the thumb on the right. */
export function RaisedHand({ className = "", mirror = false }: { className?: string; mirror?: boolean }) {
  return (
    <svg viewBox="0 0 44 56" className={className} aria-hidden="true" focusable="false">
      <g transform={mirror ? "translate(44 0) scale(-1 1)" : undefined} fill="currentColor">
        <rect x="11" y="5" width="6" height="26" rx="3" />
        <rect x="18" y="2" width="6" height="28" rx="3" />
        <rect x="25" y="4" width="6" height="27" rx="3" />
        <rect x="32" y="9" width="5.5" height="23" rx="2.75" />
        <rect x="2" y="24" width="6" height="18" rx="3" transform="rotate(-38 5 33)" />
        <path d="M10 24h28v13c0 9-6 15-14 15h-1c-7 0-13-5-13-13Z" />
      </g>
    </svg>
  );
}
