import type { SVGProps } from "react";

import type { SoundCategory } from "@/lib/soundbytes/types";

/*
 * Soundbytes' icons. The game screen is almost wordless, so each one has to
 * read on its own; every control using one carries its own aria-label.
 */

type IconProps = SVGProps<SVGSVGElement>;

const base = { "aria-hidden": true, focusable: false } as const;

export function HeadphonesIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...props}>
      <path d="M8 29v-5a16 16 0 0 1 32 0v5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <rect x="5" y="27" width="10" height="15" rx="4" fill="currentColor" />
      <rect x="33" y="27" width="10" height="15" rx="4" fill="currentColor" />
    </svg>
  );
}

/** A pointing hand, fingertip at the top left of its box. */
export function HandIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 32 36" {...base} {...props}>
      <path
        d="M9 3.5a2.6 2.6 0 0 1 5.2 0V15l1-.2v-2.2a2.5 2.5 0 0 1 5 0v2.6l.9-.1v-1.4a2.5 2.5 0 0 1 5 0v2l.4-.1a2.4 2.4 0 0 1 2.9 2.4v6.3c0 5.6-3.7 9.7-9.6 9.7h-2.4c-3.6 0-5.8-1.6-7.6-4.2l-6.4-9.4a2.6 2.6 0 0 1 4.1-3.2L9 20.6z"
        fill="#fff"
        stroke="#181b21"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PersonIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="7.5" r="4.5" fill="currentColor" />
      <path d="M3.5 21.5c0-4.7 3.8-8 8.5-8s8.5 3.3 8.5 8z" fill="currentColor" />
    </svg>
  );
}

/** A frame of film with sprocket holes. */
export function FilmIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="3" y="2.5" width="18" height="19" rx="2" fill="currentColor" />
      <rect x="7.5" y="6" width="9" height="12" rx="1" fill="var(--sb-icon-hole, #fff)" />
      {[5, 9.25, 13.5, 17.75].map((y) => (
        <g key={y} fill="var(--sb-icon-hole, #fff)">
          <rect x="4.4" y={y} width="1.8" height="2" rx="0.4" />
          <rect x="17.8" y={y} width="1.8" height="2" rx="0.4" />
        </g>
      ))}
    </svg>
  );
}

export function NoteIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M9 17.5V5.2l11-2.4v12.4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <ellipse cx="6.4" cy="17.8" rx="3.4" ry="2.7" fill="currentColor" />
      <ellipse cx="17.4" cy="15.4" rx="3.4" ry="2.7" fill="currentColor" />
    </svg>
  );
}

export function BurstIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path
        d="M12 1.5l2.2 5.6 5.3-2.6-1.9 5.6 5.4 1.9-5.4 1.9 1.9 5.6-5.3-2.6L12 22.5l-2.2-5.6-5.3 2.6 1.9-5.6L1 12l5.4-1.9-1.9-5.6 5.3 2.6z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="3.2" fill="var(--sb-icon-hole, #fff)" />
    </svg>
  );
}

export function CategoryIcon({ category, ...props }: IconProps & { category: SoundCategory }) {
  if (category === "dialogue") return <PersonIcon {...props} />;
  if (category === "score") return <NoteIcon {...props} />;
  return <BurstIcon {...props} />;
}

/** A padlock, for a line that is not open yet. */
export function LockIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path
        d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <rect x="4.5" y="10" width="15" height="11.5" rx="2.5" fill="currentColor" />
      <circle cx="12" cy="15.4" r="1.7" fill="#fff" />
    </svg>
  );
}
