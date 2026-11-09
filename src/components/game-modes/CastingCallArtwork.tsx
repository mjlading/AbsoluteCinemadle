/** A sheet of eight headshots, some crossed off in red: the casting call card. No real people. */
export function CastingCallArtwork({ className = "" }: { className?: string }) {
  const tones = ["#9aa29e", "#b7a08a", "#6b7b82", "#b8aaa0", "#8c7770", "#a6a394", "#b2bec0", "#7e8681"];
  const crossed = new Set([1, 3, 4, 6]);
  return (
    <svg viewBox="0 0 196 98" className={className} aria-hidden="true" focusable="false">
      {tones.map((tone, i) => {
        const x = (i % 4) * 49 + 2;
        const y = Math.floor(i / 4) * 49 + 2;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <rect width="44" height="44" rx="4" fill={tone} />
            <circle cx="22" cy="18" r="8" fill="rgb(0 0 0 / 0.22)" />
            <path d="M6 44 C8 32 15 28 22 28 C29 28 36 32 38 44 Z" fill="rgb(0 0 0 / 0.22)" />
            {crossed.has(i) && (
              <g stroke="#d92b3f" strokeWidth="4.5" strokeLinecap="round" fill="none">
                <path d="M7 8 C17 20 27 30 37 37" />
                <path d="M37 7 C27 19 17 29 8 37" />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
