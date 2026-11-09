import type { Metadata } from "next";
import Link from "next/link";

import { PuzzleList } from "@/components/collage/PuzzleList";
import { KeywordCollageArtwork } from "@/components/game-modes/KeywordCollageArtwork";
import { SiteFooter } from "@/components/game/SiteFooter";

export const metadata: Metadata = {
  title: "Close-Ups | Absolute Cinemadle",
  description: "A movie and series guessing game in development.",
};

export default function CloseUpsPage() {
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
          <h1 className="mt-4 font-display text-6xl font-[900] leading-[0.85] sm:text-7xl">Close-Ups</h1>
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

          <section aria-labelledby="play-heading" className="md:pt-1">
            <h2 id="play-heading" className="font-display text-4xl font-[850] leading-none">
              Play
            </h2>
            <div className="mt-3">
              <PuzzleList />
            </div>
          </section>
        </div>
      </main>
      <SiteFooter wide />
    </>
  );
}
