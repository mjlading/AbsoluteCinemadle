import type { Metadata } from "next";
import Link from "next/link";

import { KeywordCollageArtwork } from "@/components/game-modes/KeywordCollageArtwork";
import { SiteFooter } from "@/components/game/SiteFooter";

export const metadata: Metadata = {
  title: "Keyword collage | Absolute Cinemadle",
  description: "A movie and series guessing game in development.",
};

export default function KeywordCollagePage() {
  return (
    <>
      <main className="mx-auto w-full max-w-[62rem] px-4 pb-12 pt-4 sm:px-8">
        <nav aria-label="Game navigation">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-semibold hover:underline">
            <span aria-hidden="true">←</span> All games
          </Link>
        </nav>

        <header className="mt-5">
          <span className="inline-block rounded-sm bg-[var(--tier-2)] px-2 py-1 text-xs font-bold uppercase tracking-wide text-on-tape">
            In development
          </span>
          <h1 className="mt-4 font-display text-6xl font-[900] leading-[0.85] sm:text-7xl">Keyword collage</h1>
          <p className="mt-4 max-w-xl text-lg leading-snug text-ink-soft">
            Guess the movie or series from a collage of close-ups. Every clue in a hint shares one keyword.
          </p>
        </header>

        <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:items-start">
          <section
            aria-labelledby="example-heading"
            className="overflow-hidden rounded-lg bg-sheet p-4 text-lamp sm:p-6"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-lamp/75">Example hint</p>
                <h2 id="example-heading" className="mt-1 font-display text-5xl font-[850] leading-none">
                  Shoes
                </h2>
              </div>
              <p className="text-sm text-lamp/75">Illustration only</p>
            </div>
            <KeywordCollageArtwork className="mt-5" />
            <p className="mt-4 text-sm leading-snug text-lamp/75">
              These are illustrations, not film or series images.
            </p>
          </section>

          <section aria-labelledby="guess-heading" className="md:pt-1">
            <h2 id="guess-heading" className="font-display text-4xl font-[850] leading-none">
              Guess the title
            </h2>
            <p className="mt-3 leading-snug text-ink-soft">
              This game is a preview. Image clues and guessing are not available yet.
            </p>
            <fieldset disabled className="mt-5">
              <label htmlFor="collage-guess" className="block font-semibold">
                Movie or series
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="collage-guess"
                  type="text"
                  placeholder="Movie or series title"
                  className="min-h-11 min-w-0 flex-1 rounded-md border border-ink/20 bg-surface px-3 text-ink placeholder:text-ink-soft"
                />
                <button type="button" className="min-h-11 rounded-md bg-ink/15 px-5 font-semibold text-ink-soft">
                  Guess
                </button>
              </div>
            </fieldset>
          </section>
        </div>
      </main>
      <SiteFooter wide />
    </>
  );
}
