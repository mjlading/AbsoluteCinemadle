const frames = [
  { background: "bg-[#bea88c]", ink: "text-[#5d4739]", rotation: "-rotate-12" },
  { background: "bg-[#8a9b91]", ink: "text-[#354f49]", rotation: "rotate-6" },
  { background: "bg-[#b79389]", ink: "text-[#673e42]", rotation: "rotate-12" },
  { background: "bg-[#8b9aa8]", ink: "text-[#354b61]", rotation: "-rotate-6" },
] as const;

export function KeywordCollageArtwork({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`grid grid-cols-2 gap-1.5 ${className}`}>
      {frames.map((frame) => (
        <div
          key={frame.background}
          className={`relative grid aspect-square place-items-center overflow-hidden rounded-[2px] ${frame.background} ${frame.ink}`}
        >
          <span className="absolute inset-2 border border-current/20" />
          <svg viewBox="0 0 64 64" className={`w-3/4 ${frame.rotation}`} focusable="false">
            <path fill="currentColor" d="M8 41c5-1 10-5 14-13l9 3 3 7 12 3c6 1 10 5 10 10v2H7v-4c0-4 0-6 1-8Z" />
            <path d="M24 33l8 3m-10 1 10 3M8 48h47" fill="none" stroke="#f4eee6" strokeWidth="2" />
          </svg>
        </div>
      ))}
    </div>
  );
}
