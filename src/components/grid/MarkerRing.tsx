/** The hand-drawn china-marker circle around a selected tile. */
export function MarkerRing() {
  return (
    <svg
      className="marker-ring pointer-events-none absolute -inset-[3px] z-[1] overflow-visible"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path pathLength={100} d="M20 16C42 5 80 6 91 30C98 52 92 82 64 91C38 98 10 88 7 61C5 37 16 17 42 9" />
    </svg>
  );
}
