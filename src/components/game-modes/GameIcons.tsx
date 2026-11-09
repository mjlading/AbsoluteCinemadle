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

/** The outline of one raised open hand, palm out, thumb on the left. */
const HAND =
  "M32 110C29 106 25 96 22 87C16 80 9 71 5.5 63C3 57 8 52.5 13 55.5C18.5 59 24.5 66 30.5 70.5C31.5 62 30.5 52 29.5 46C27.5 34 24.5 21 23 12.5C22 5 31 3 32.5 10C34.5 20 37 33 39.5 44C40.5 47.5 43.5 47.5 44.5 44C44.5 32 44.5 17 45 8.5C45.5 1.5 55 1.5 55.5 8.5C56 18 55.5 32 55.5 44C56.5 47.5 59.5 47.5 60.5 44.5C61.5 33 63.5 21 65.5 12.5C67 5.5 75.5 7.5 74.5 14.5C73 24 70.5 36 69.5 46C70.5 49.5 73.5 49.5 74.5 47C76.5 40 80 31 83.5 24.5C86.5 18.5 93.5 22 91.5 28.5C88.5 38 84.5 48 82.5 58.5C80.5 72 78.5 84 74.5 94C72.5 100 70.5 106 70 110Z";

/** One raised open hand, the meme's gesture, thumb on the left; `mirror` puts the thumb on the right. */
export function RaisedHand({ className = "", mirror = false }: { className?: string; mirror?: boolean }) {
  return (
    <svg viewBox="0 0 100 112" className={className} aria-hidden="true" focusable="false">
      <path d={HAND} fill="currentColor" transform={mirror ? "translate(100 0) scale(-1 1)" : undefined} />
    </svg>
  );
}
