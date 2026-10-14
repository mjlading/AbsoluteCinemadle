/**
 * A pictogram nodding to the "absolute cinema" meme: a generic seated figure in
 * an armchair raising both open hands under a spotlight. Deliberately simple and
 * featureless, so it depicts a gesture rather than a person.
 */
export function AbsoluteCinemaFigure({ animated = false, className = "" }: { animated?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`${animated ? "cinema-figure-animated" : ""} ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="cinema-spot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe7a6" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffe7a6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon className="cinema-spot" points="52,0 68,0 108,120 12,120" fill="url(#cinema-spot)" />
      <g fill="currentColor">
        {/* Armchair */}
        <rect x="30" y="50" width="60" height="54" rx="12" opacity="0.45" />
        <rect x="18" y="74" width="18" height="34" rx="7" />
        <rect x="84" y="74" width="18" height="34" rx="7" />
        <rect x="28" y="96" width="64" height="16" rx="5" />
        {/* Figure */}
        <circle cx="60" cy="41" r="9.5" />
        <path d="M45 58 Q60 52 75 58 L71 96 L49 96 Z" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path className="cinema-arm cinema-arm-left" d="M47 60 L34 50 L32 30" />
        <path className="cinema-arm cinema-arm-right" d="M73 60 L86 50 L88 30" />
      </g>
      <g fill="currentColor">
        <g className="cinema-arm cinema-arm-left">
          <ellipse cx="32" cy="25" rx="6" ry="7" />
          <path
            d="M27 21 L25 12 M30 19 L29.5 9.5 M34 19 L35 10 M37 22 L40 14"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </g>
        <g className="cinema-arm cinema-arm-right">
          <ellipse cx="88" cy="25" rx="6" ry="7" />
          <path
            d="M93 21 L95 12 M90 19 L90.5 9.5 M86 19 L85 10 M83 22 L80 14"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}
