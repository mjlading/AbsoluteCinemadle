/** A small film reel that spins while something loads. */
export function ReelSpinner({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`reel-spinner ${className}`} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      {[0, 72, 144, 216, 288].map((angle) => (
        <circle
          key={angle}
          cx={12 + 5.6 * Math.sin((angle * Math.PI) / 180)}
          cy={12 - 5.6 * Math.cos((angle * Math.PI) / 180)}
          r="2.3"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
