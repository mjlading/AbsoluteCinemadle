import Image from "next/image";

import { SITE } from "@/config/site";

const TMDB_NOTICE =
  "This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.";

function ClipsNote() {
  return (
    <>
      Film clips are short excerpts used for play. Questions or takedowns:{" "}
      <a href={`mailto:${SITE.contact}`} className="underline hover:text-ink">
        {SITE.contact}
      </a>
    </>
  );
}

/**
 * TMDB attribution, worded as their terms require, a note on the film clips and where to send takedown requests.
 * `wide` lines up with the home page; the default with the game pages.
 * `compact` is one tight row for one-screen games, which also credits what the game shows:
 * film stills (Close-Ups) or film clips (Soundbytes).
 */
export function SiteFooter({
  wide = false,
  compact = false,
  credit = "stills",
}: {
  wide?: boolean;
  compact?: boolean;
  credit?: "stills" | "clips";
}) {
  if (compact) {
    return (
      <footer className="flex w-full shrink-0 items-center justify-center gap-2.5 px-4 py-2 text-[11px] leading-[1.3] text-ink-soft">
        <Image src="/tmdb-logo.svg" alt="TMDB" width={60} height={8} unoptimized className="shrink-0" />
        <p>
          {TMDB_NOTICE} {credit === "clips" ? <ClipsNote /> : "Film stills belong to their copyright holders."}
        </p>
      </footer>
    );
  }
  return (
    <footer
      className={`mx-auto mt-auto flex w-full items-start gap-3 px-4 pb-8 pt-6 text-xs leading-snug text-ink-soft ${
        wide ? "max-w-[62rem] sm:px-8" : "max-w-[34rem]"
      }`}
    >
      <Image src="/tmdb-logo.svg" alt="TMDB" width={74} height={10} unoptimized className="mt-0.5 shrink-0" />
      <p>
        {TMDB_NOTICE} <ClipsNote />
      </p>
    </footer>
  );
}
