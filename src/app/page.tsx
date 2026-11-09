import Link from "next/link";

import { CastingCallArtwork } from "@/components/game-modes/CastingCallArtwork";
import { KeywordCollageArtwork } from "@/components/game-modes/KeywordCollageArtwork";
import { SPEAKER_CLOTH, SoundbytesArtwork } from "@/components/game-modes/SoundbytesArtwork";
import { SiteFooter } from "@/components/game/SiteFooter";
import { SITE } from "@/config/site";

export default function Home() {
  return (
    <>
      <main className="mx-auto w-full max-w-[62rem] px-4 pb-12 pt-6 sm:px-8 sm:pt-9">
        <header className="border-b border-ink/15 pb-5">
          <h1 className="font-display text-[2.6rem] font-[900] leading-[0.85] tracking-[-0.01em]">
            Absolute Cinemadle
          </h1>
          <p className="mt-2 text-sm text-ink-soft">Movie and series games</p>
        </header>

        <section aria-labelledby="games-heading" className="mt-9 sm:mt-12">
          <h2 id="games-heading" className="font-display text-5xl font-[900] leading-[0.9] sm:text-6xl">
            Pick your game<span className="text-marker">.</span>
          </h2>
          <p className="mt-3 max-w-xl text-ink-soft">A little something for people who love the details on screen.</p>

          <ul className="mt-7 grid gap-5 sm:grid-cols-2 sm:gap-6">
            <li>
              <Link
                href={SITE.games.closeUps}
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-ink/15 bg-surface transition-transform hover:-translate-y-1 motion-reduce:transform-none"
              >
                <div
                  aria-hidden="true"
                  className="flex min-h-52 items-center justify-center gap-6 bg-[#d3e6e8] px-5 py-6 text-[#1b3035]"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide">Example keyword</p>
                    <p className="mt-1 font-display text-5xl font-[900] leading-none sm:text-6xl">Shoes</p>
                    <p className="mt-3 max-w-28 text-sm leading-snug">One detail, many close-ups.</p>
                  </div>
                  <KeywordCollageArtwork className="w-36 shrink-0 rotate-3 sm:w-40" />
                </div>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <span className="w-fit rounded-sm bg-[var(--tier-2)] px-2 py-1 text-xs font-bold uppercase tracking-wide text-on-tape">
                    In development
                  </span>
                  <h3 className="mt-4 font-display text-4xl font-[850] leading-none">Close-Ups</h3>
                  <p className="mt-3 max-w-sm leading-snug text-ink-soft">
                    Guess the movie or series from a collection of clues sharing one detail.
                  </p>
                  <span className="mt-6 font-semibold text-ink">
                    See the idea{" "}
                    <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </div>
              </Link>
            </li>
            <li>
              <Link
                href={SITE.games.soundbytes}
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-ink/15 bg-surface transition-transform hover:-translate-y-1 motion-reduce:transform-none"
              >
                <div
                  aria-hidden="true"
                  className="flex min-h-52 items-center justify-center px-5 py-6"
                  style={SPEAKER_CLOTH}
                >
                  <SoundbytesArtwork className="w-48 sm:w-52" />
                </div>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <span className="w-fit rounded-sm bg-[var(--tier-2)] px-2 py-1 text-xs font-bold uppercase tracking-wide text-on-tape">
                    In development
                  </span>
                  <h3 className="mt-4 font-display text-4xl font-[850] leading-none">Soundbytes</h3>
                  <p className="mt-3 max-w-sm leading-snug text-ink-soft">
                    Guess the film by ear, from short clips that start out disguised.
                  </p>
                  <span className="mt-6 font-semibold text-ink">
                    Pick a board{" "}
                    <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </div>
              </Link>
            </li>
            <li>
              <Link
                href={SITE.games.castingCall}
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-ink/15 bg-surface transition-transform hover:-translate-y-1 motion-reduce:transform-none"
              >
                <div aria-hidden="true" className="flex min-h-52 items-center justify-center bg-sheet px-5 py-6">
                  <CastingCallArtwork className="w-56 sm:w-64" />
                </div>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <span className="w-fit rounded-sm bg-[var(--tier-3)] px-2 py-1 text-xs font-bold uppercase tracking-wide text-on-tape">
                    New
                  </span>
                  <h3 className="mt-4 font-display text-4xl font-[850] leading-none">Casting call</h3>
                  <p className="mt-3 max-w-sm leading-snug text-ink-soft">
                    Eight actors, one draining clock. Name films they&rsquo;re in and cross them all out in five
                    guesses.
                  </p>
                  <span className="mt-6 font-semibold text-ink">
                    Pick a board{" "}
                    <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </div>
              </Link>
            </li>
          </ul>
        </section>
      </main>
      <SiteFooter wide />
    </>
  );
}
