import Image from "next/image";

/** TMDB attribution, worded as their terms require. */
export function SiteFooter() {
  return (
    <footer className="mx-auto mt-auto flex w-full max-w-[34rem] items-start gap-3 px-4 pb-8 pt-6 text-xs leading-snug text-ink-soft">
      <Image src="/tmdb-logo.svg" alt="TMDB" width={74} height={10} unoptimized className="mt-0.5 shrink-0" />
      <p>This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.</p>
    </footer>
  );
}
