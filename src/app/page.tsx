import Link from "next/link";

import { GameCard } from "@/components/game-modes/GameCard";
import { CastingCallIcon, CloseUpsIcon, RaisedHand, SoundbytesIcon } from "@/components/game-modes/GameIcons";
import { SiteFooter } from "@/components/game/SiteFooter";
import { SITE } from "@/config/site";

const PROTOTYPES = [
  { title: "Carbon Dating", blurb: "Guess the year a still is from.", href: SITE.games.carbonDating },
  { title: "How Old Were They?", blurb: "Guess an actor's age in a film.", href: SITE.games.howOld },
  { title: "Double Feature", blurb: "Two films, one question: which wins?", href: SITE.games.doubleFeature },
  { title: "Ratings Cliff", blurb: "Name the series from its episode ratings.", href: SITE.games.ratingsCliff },
  { title: "Deep Cut", blurb: "Name a film that fits, the rarer the better.", href: SITE.games.deepCut },
];

export default function Home() {
  return (
    <>
      <main className="mx-auto w-full max-w-[62rem] px-4 pb-12 pt-12 sm:px-8 sm:pt-20">
        {/* The name's meme as a logo: the caption stacked small over big, between two raised hands. */}
        <header className="flex items-center justify-center gap-3 [--hand-size:3rem] sm:gap-6 sm:[--hand-size:4.25rem]">
          <RaisedHand side="left" className="shrink-0 text-ink" />
          <h1 className="text-center font-display font-[900] uppercase leading-[0.8] tracking-[0.01em] text-ink">
            <span className="block text-2xl tracking-[0.18em] sm:text-4xl">Absolute</span>
            <span className="block text-6xl sm:text-8xl">Cinemadle</span>
          </h1>
          <RaisedHand side="right" className="shrink-0 text-ink" />
        </header>

        <section aria-label="Games" className="mt-12 sm:mt-16">
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <li>
              <GameCard
                title="Close-Ups"
                blurb="Four close-ups, one keyword. Name the film."
                color="#8fd3e0"
                tag="New"
                icon={<CloseUpsIcon className="size-24" />}
                href={SITE.games.closeUps}
              />
            </li>
            <li>
              <GameCard
                title="Casting call"
                blurb="Name films to cross out the whole cast."
                color="#f09cc3"
                tag="New"
                icon={<CastingCallIcon className="size-24" />}
                href={SITE.games.castingCall}
              />
            </li>
            <li>
              <GameCard
                title="Soundbytes"
                blurb="Name the film by ear."
                color="#f2c641"
                tag="New"
                icon={<SoundbytesIcon className="size-24" />}
                href={SITE.games.soundbytes}
              />
            </li>
          </ul>
        </section>

        {/* Prototypes under test: plain links until one earns a card. */}
        <section aria-labelledby="prototypes-heading" className="mt-12">
          <h2
            id="prototypes-heading"
            className="font-condensed text-lg font-bold uppercase tracking-wide text-ink-soft"
          >
            Prototypes
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROTOTYPES.map((game) => (
              <li key={game.href}>
                <Link href={game.href} className="block rounded-xl border-2 border-ink/15 px-4 py-3 hover:border-ink">
                  <span className="block font-display text-2xl font-[900]">{game.title}</span>
                  <span className="block text-sm text-ink-soft">{game.blurb}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter wide />
    </>
  );
}
