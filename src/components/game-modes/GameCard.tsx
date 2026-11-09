import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A game on the home page: one link, all in the game's own color, with its
 * icon, name, one line about it and a Play pill that marks the card as the way in.
 */
export function GameCard({
  title,
  blurb,
  color,
  icon,
  tag,
  href,
}: {
  title: string;
  blurb: string;
  /** The card's background; the text on it is always ink. */
  color: string;
  icon: ReactNode;
  /** A paper-tape tag in the card's corner, such as "New". */
  tag?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex h-full flex-col items-center gap-4 rounded-xl px-6 pb-6 pt-12 text-center text-on-tape transition-transform hover:-translate-y-1 motion-reduce:transform-none"
      style={{ backgroundColor: color }}
    >
      {tag && (
        <span className="closeups-tape absolute left-4 top-4 bg-[var(--tier-4)] px-2.5 py-1 font-condensed text-xs font-extrabold uppercase tracking-[0.08em]">
          {tag}
        </span>
      )}
      <div
        aria-hidden="true"
        className="grid h-24 place-items-center transition-transform duration-300 group-hover:scale-[1.05] motion-reduce:transform-none"
      >
        {icon}
      </div>
      <h3 className="font-display text-[2.1rem] font-[900] leading-none">{title}</h3>
      <p className="max-w-64 flex-1 text-[15px] leading-snug text-on-tape/75">{blurb}</p>
      <span
        aria-hidden="true"
        className="rounded-full bg-on-tape px-7 py-2.5 font-semibold text-[#f4f1ea] transition-transform group-hover:scale-105 motion-reduce:transform-none"
      >
        Play
      </span>
    </Link>
  );
}
