import Link from "next/link";

/**
 * The top bar of a one-screen daily game: back to the game list, the game's
 * name with the day's number, the archive and, once the game has loaded, help.
 */
export function GameTopBar({
  title,
  number,
  archiveHref,
  onHelp,
}: {
  title: string;
  number: number | null;
  archiveHref: string;
  onHelp?: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 px-2">
      <Link href="/" aria-label="All games" className="grid size-11 place-items-center rounded-full hover:bg-ink/8">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-[22px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </Link>
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <h1 className="font-display text-[30px] font-[900] leading-none tracking-[-0.005em]">{title}</h1>
        {number && <span className="font-condensed text-[15px] font-bold text-ink-soft">#{number}</span>}
      </div>
      <Link
        href={archiveHref}
        aria-label="Previous days"
        title="Previous days"
        className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-ink/8"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-[22px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      </Link>
      {onHelp && (
        <button
          type="button"
          onClick={onHelp}
          aria-label="How to play"
          className="mr-1.5 grid size-[34px] shrink-0 place-items-center rounded-full border-[1.5px] border-ink font-display text-xl font-[900] leading-none hover:bg-ink/8"
        >
          ?
        </button>
      )}
    </header>
  );
}
