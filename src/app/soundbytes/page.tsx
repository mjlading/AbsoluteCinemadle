import type { Metadata } from "next";
import Link from "next/link";

import { SPEAKER_CLOTH, SoundbytesArtwork } from "@/components/game-modes/SoundbytesArtwork";
import { SiteFooter } from "@/components/game/SiteFooter";
import { BoardList } from "@/components/soundbytes/BoardList";

export const metadata: Metadata = {
  title: "Soundbytes | Absolute Cinemadle",
  description: "A movie guessing game played by ear, in development.",
};

export default function SoundbytesPage() {
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
          <h1 className="mt-4 font-display text-6xl font-[900] leading-[0.85] sm:text-7xl">Soundbytes</h1>
          <p className="mt-4 max-w-xl text-lg leading-snug text-ink-soft">
            Guess the film by ear. Every clip starts disguised; pay to hear it clearly. These boards use placeholder
            sounds for now.
          </p>
        </header>

        <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-start">
          <div className="rounded-lg p-6" style={SPEAKER_CLOTH}>
            <SoundbytesArtwork className="mx-auto w-full max-w-64" />
          </div>
          <section aria-labelledby="boards-heading">
            <h2 id="boards-heading" className="font-display text-4xl font-[850] leading-none">
              Play
            </h2>
            <p className="mt-3 leading-snug text-ink-soft">Pick a board. Each one is a different film.</p>
            <div className="mt-4">
              <BoardList />
            </div>
          </section>
        </div>
      </main>
      <SiteFooter wide />
    </>
  );
}
