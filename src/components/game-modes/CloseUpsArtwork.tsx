/*
 * A Close-Ups board in miniature: the contact sheet, a "Hats" tape label with
 * empty slots for the keywords still to come, four different hats as the
 * close-ups, and the Enhance magnifier where they meet. Illustration only.
 */

const HATS = [
  {
    // Top hat
    tile: "#b9a283",
    ink: "#3f3025",
    tilt: "-rotate-6",
    shape: (
      <>
        <path d="M22 12h20l-2 28H24Z" />
        <path d="M23 33h18v5H23Z" fill="#e9dccb" />
        <ellipse cx="32" cy="42" rx="23" ry="5" />
      </>
    ),
  },
  {
    // Fedora
    tile: "#879a8f",
    ink: "#26403a",
    tilt: "rotate-3",
    shape: (
      <>
        <path d="M17 39c0-12 4-21 9-21 3 0 4 3 6 3s3-3 6-3c5 0 9 9 9 21Z" />
        <path d="M17 33h30v5H17Z" fill="#dfe6df" />
        <path d="M5 39c9 7 45 7 54 0-6 2-48 2-54 0Z" />
      </>
    ),
  },
  {
    // Cowboy hat
    tile: "#b48d84",
    ink: "#55302f",
    tilt: "rotate-6",
    shape: (
      <>
        <path d="M21 37c0-13 4-19 8-19 2 0 2 3 3 3s1-3 3-3c4 0 8 6 8 19Z" />
        <path d="M21 32h22v4H21Z" fill="#f0dcd5" />
        <path d="M3 30c4 9 13 13 29 13s25-4 29-13c-5 5-14 8-29 8S8 35 3 30Z" />
      </>
    ),
  },
  {
    // Cap
    tile: "#8797a8",
    ink: "#253a52",
    tilt: "-rotate-3",
    shape: (
      <>
        <path d="M12 38c0-12 8-20 19-20s19 8 19 20Z" />
        <path d="M31 18v20" stroke="#dbe3ec" strokeWidth="1.5" fill="none" />
        <circle cx="31" cy="18" r="2.5" />
        <path d="M44 34c8-1 14 0 16 4H44Z" />
      </>
    ),
  },
] as const;

/** `bare` leaves out the keyword strip, for icon-sized uses where its label would be too small to read. */
export function CloseUpsArtwork({ className = "", bare = false }: { className?: string; bare?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-xl bg-sheet p-1.5 shadow-[0_18px_34px_-16px_rgb(0_0_0/0.55)] ${className}`}
    >
      {!bare && (
        <div className="mb-1.5 flex h-5 gap-1">
          <span className="closeups-tape grid flex-1 place-items-center bg-[var(--tier-4)] font-condensed text-[9px] font-extrabold uppercase tracking-[0.08em] text-on-tape">
            Hats
          </span>
          {[0, 1, 2, 3].map((slot) => (
            <span key={slot} className="flex-1 rounded-[2px] border border-dashed border-lamp/20" />
          ))}
        </div>
      )}
      <div className="relative grid grid-cols-2 gap-[3px] overflow-hidden rounded-md">
        {HATS.map((hat) => (
          <div
            key={hat.tile}
            className="grid aspect-square place-items-center"
            style={{
              backgroundColor: hat.tile,
              backgroundImage: "radial-gradient(circle at 50% 45%, rgb(255 255 255 / 0.18), rgb(0 0 0 / 0.28) 85%)",
              color: hat.ink,
            }}
          >
            <svg viewBox="0 0 64 56" className={`w-[88%] ${hat.tilt}`} fill="currentColor" focusable="false">
              {hat.shape}
            </svg>
          </div>
        ))}
        <span className="absolute left-1/2 top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-[rgb(16_18_22/0.6)] text-white backdrop-blur-sm">
          <svg
            viewBox="0 0 24 24"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5 21 21M8 10.5h5M10.5 8v5" />
          </svg>
        </span>
      </div>
    </div>
  );
}
