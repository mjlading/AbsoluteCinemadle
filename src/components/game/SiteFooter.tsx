import Image from "next/image";

/** TMDB attribution, worded as their terms require. */
/** `wide` lines up with the home page, `narrow` with the Soundbytes board; the default with the game pages. */
export function SiteFooter({ wide = false, narrow = false }: { wide?: boolean; narrow?: boolean }) {
  return (
    <footer
      className={`mx-auto mt-auto flex w-full items-start gap-3 px-4 pb-8 pt-6 text-xs leading-snug text-ink-soft ${
        wide ? "max-w-[62rem] sm:px-8" : narrow ? "max-w-[30rem]" : "max-w-[34rem]"
      }`}
    >
      <Image src="/tmdb-logo.svg" alt="TMDB" width={74} height={10} unoptimized className="mt-0.5 shrink-0" />
      <p>This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.</p>
    </footer>
  );
}
