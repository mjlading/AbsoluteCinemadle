import Image from "next/image";

const TMDB_NOTICE =
  "This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.";

/**
 * TMDB attribution, worded as their terms require.
 * `wide` lines up with the home page, `narrow` with the Soundbytes board; the default with the game pages.
 * `compact` is one tight row for one-screen games, which also credits the film stills.
 */
export function SiteFooter({
  wide = false,
  narrow = false,
  compact = false,
}: {
  wide?: boolean;
  narrow?: boolean;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <footer className="flex w-full shrink-0 items-center justify-center gap-2.5 px-4 py-2 text-[11px] leading-[1.3] text-ink-soft">
        <Image src="/tmdb-logo.svg" alt="TMDB" width={60} height={8} unoptimized className="shrink-0" />
        <p>{TMDB_NOTICE} Film stills belong to their copyright holders.</p>
      </footer>
    );
  }
  return (
    <footer
      className={`mx-auto mt-auto flex w-full items-start gap-3 px-4 pb-8 pt-6 text-xs leading-snug text-ink-soft ${
        wide ? "max-w-[62rem] sm:px-8" : narrow ? "max-w-[30rem]" : "max-w-[34rem]"
      }`}
    >
      <Image src="/tmdb-logo.svg" alt="TMDB" width={74} height={10} unoptimized className="mt-0.5 shrink-0" />
      <p>{TMDB_NOTICE}</p>
    </footer>
  );
}
