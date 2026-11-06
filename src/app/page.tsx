import Link from "next/link";

import { KeywordCollageArtwork } from "@/components/game-modes/KeywordCollageArtwork";
import { SPEAKER_CLOTH, SoundbytesArtwork } from "@/components/game-modes/SoundbytesArtwork";
import { SiteFooter } from "@/components/game/SiteFooter";
import { RULES } from "@/config/rules";
import { SITE } from "@/config/site";

const frameColors = [
  "bg-[#9aa29e]",
  "bg-[#b7a08a]",
  "bg-[#6b7b82]",
  "bg-[#b8aaa0]",
  "bg-[#8c7770]",
  "bg-[#a6a394]",
  "bg-[#b2bec0]",
  "bg-[#7e8681]",
  "bg-[#a8ada4]",
  "bg-[#9d8374]",
  "bg-[#788a8f]",
  "bg-[#c0ad99]",
  "bg-[#84928d]",
  "bg-[#b6a79b]",
  "bg-[#8d8980]",
  "bg-[#9fa9a7]",
];
const selectedFrames = new Set([1, 4, 10, 15]);

function DailyArtwork() {
  const { groupCount, groupSize } = RULES.grid;

  return (
    <div aria-hidden="true" className="flex min-h-52 items-center justify-center gap-6 bg-sheet px-5 py-6 text-lamp">
      <div className="grid w-36 shrink-0 grid-cols-4 gap-1 sm:w-40">
        {frameColors.map((color, index) => (
          <div key={index} className={`relative aspect-square overflow-hidden rounded-[2px] ${color}`}>
            <span className="absolute left-[18%] top-[18%] size-[35%] rounded-full bg-black/15" />
            <span className="absolute -bottom-[20%] right-[-10%] h-[65%] w-[85%] rotate-[-18deg] bg-black/15" />
            {selectedFrames.has(index) && (
              <span className="absolute inset-[8%] rounded-[45%] border-[3px] border-[#f54d5c]" />
            )}
          </div>
        ))}
      </div>
      <div className="min-w-0">
        <p className="font-display text-3xl font-[850] leading-[0.95] sm:text-4xl">
          {groupCount} films.
          <br />
          {groupCount * groupSize} frames.
        </p>
        <p className="mt-3 max-w-28 text-sm leading-snug text-lamp/75">Find the connections.</p>
      </div>
    </div>
  );
}

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
                href={SITE.games.daily}
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-ink/15 bg-surface transition-transform hover:-translate-y-1 motion-reduce:transform-none"
              >
                <DailyArtwork />
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <span className="w-fit rounded-sm bg-[var(--tier-1)] px-2 py-1 text-xs font-bold uppercase tracking-wide text-on-tape">
                    Play now
                  </span>
                  <h3 className="mt-4 font-display text-4xl font-[850] leading-none">Daily film puzzle</h3>
                  <p className="mt-3 max-w-sm leading-snug text-ink-soft">
                    Find four films in a grid of frames, with a warm-up and a bonus round.
                  </p>
                  <span className="mt-6 font-semibold text-ink">
                    Play today{" "}
                    <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </div>
              </Link>
            </li>
            <li>
              <Link
                href={SITE.games.keywordCollage}
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
                  <h3 className="mt-4 font-display text-4xl font-[850] leading-none">Keyword collage</h3>
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
          </ul>
        </section>
      </main>
      <SiteFooter wide />
    </>
  );
}
