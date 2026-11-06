/** Three records pinned to a corkboard, one wearing a balloon: an illustration, not film audio. */
export function SoundbytesArtwork({ className = "" }: { className?: string }) {
  const records = [
    { x: 46, y: 70, r: 27, label: "var(--tier-1)", tilt: -6 },
    { x: 108, y: 44, r: 21, label: "var(--tier-2)", tilt: 5 },
    { x: 112, y: 104, r: 19, label: "var(--tier-3)", tilt: -3 },
  ];
  return (
    <svg viewBox="0 0 150 140" aria-hidden="true" focusable="false" className={className}>
      {/* Balloon on the big record, tied at the pin. */}
      <path d="M46 43c-3-8 4-12 1-20" fill="none" stroke="#fff" strokeWidth="1.2" />
      <path d="M47 3c-8 0-13 6-13 13 0 9 7 15 12 17h2c5-2 12-8 12-17 0-7-5-13-13-13z" fill="#e23b4b" />
      <ellipse cx="41.5" cy="11" rx="2.4" ry="4" transform="rotate(28 41.5 11)" fill="#fff" opacity="0.45" />
      {records.map((rec) => (
        <g key={rec.x} transform={`rotate(${rec.tilt} ${rec.x} ${rec.y})`}>
          <circle cx={rec.x + 1.5} cy={rec.y + 3} r={rec.r} fill="#000" opacity="0.28" />
          <circle cx={rec.x} cy={rec.y} r={rec.r} fill="#1d2026" />
          {[0.86, 0.72, 0.58].map((f) => (
            <circle key={f} cx={rec.x} cy={rec.y} r={rec.r * f} fill="none" stroke="#2c3039" strokeWidth="1.4" />
          ))}
          <circle cx={rec.x} cy={rec.y} r={rec.r * 0.44} fill={rec.label} />
          <circle cx={rec.x} cy={rec.y} r="1.6" fill="#1d2026" />
          <rect x={rec.x - rec.r * 0.8} y={rec.y + rec.r - 4} width={rec.r * 1.6} height="8" fill="#edebe3" />
          <circle cx={rec.x} cy={rec.y - rec.r + 2} r="3.2" fill="#d92b3f" />
        </g>
      ))}
    </svg>
  );
}
