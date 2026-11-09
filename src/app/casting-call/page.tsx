import type { Metadata } from "next";
import Link from "next/link";

import { BoardList } from "@/components/casting-call/BoardList";
import { CastingCallArtwork } from "@/components/game-modes/CastingCallArtwork";
import { SiteFooter } from "@/components/game/SiteFooter";
import { RULES } from "@/config/rules";
import { BOARDS } from "@/lib/casting-call/boards";

export const metadata: Metadata = {
  title: "Casting call | Absolute Cinemadle",
  description: "Eight actors' faces: name films they're in and cross them all out in as few guesses as you can.",
};

export default function CastingCallPage() {
  const boards = BOARDS.map(({ id, name }) => ({ id, name }));
  const { faceCount, maxGuesses } = RULES.castingCall;
  return (
    <>
      <main className="mx-auto w-full max-w-[62rem] px-4 pb-12 pt-4 sm:px-8">
        <nav aria-label="Game navigation">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-semibold hover:underline">
            <span aria-hidden="true">←</span> All games
          </Link>
        </nav>

        <header className="mt-5">
          <span className="inline-block rounded-sm bg-[var(--tier-3)] px-2 py-1 text-xs font-bold uppercase tracking-wide text-on-tape">
            New
          </span>
          <h1 className="mt-4 font-display text-6xl font-[900] leading-[0.85] sm:text-7xl">Casting call</h1>
          <p className="mt-4 max-w-xl text-lg leading-snug text-ink-soft">
            {faceCount} actors, one draining clock. Name films they&rsquo;re in: each film crosses out everyone on the
            board in its cast and refills the bar. Cross out all {faceCount} in as few guesses as you can; after{" "}
            {maxGuesses}, it&rsquo;s a wrap.
          </p>
        </header>

        <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-start">
          <div className="rounded-lg bg-sheet p-6">
            <CastingCallArtwork className="mx-auto w-full max-w-72" />
          </div>
          <section aria-labelledby="boards-heading">
            <h2 id="boards-heading" className="font-display text-4xl font-[850] leading-none">
              Play
            </h2>
            <p className="mt-3 leading-snug text-ink-soft">Pick a board. Each one is a different set of actors.</p>
            <div className="mt-4">
              <BoardList boards={boards} />
            </div>
          </section>
        </div>
      </main>
      <SiteFooter wide />
    </>
  );
}
