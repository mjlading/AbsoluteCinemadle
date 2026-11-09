import { GameCard } from "@/components/game-modes/GameCard";
import { CastingCallIcon, CloseUpsIcon, RaisedHand, SoundbytesIcon } from "@/components/game-modes/GameIcons";
import { SiteFooter } from "@/components/game/SiteFooter";
import { SITE } from "@/config/site";

export default function Home() {
  return (
    <>
      <main className="mx-auto w-full max-w-[62rem] px-4 pb-12 pt-12 sm:px-8 sm:pt-20">
        {/* The name's meme as a logo: the caption stacked small over big, between two raised hands. */}
        <header className="flex items-center justify-center gap-3 sm:gap-6">
          <RaisedHand mirror className="w-12 shrink-0 -rotate-12 text-ink sm:w-[4.5rem]" />
          <h1 className="text-center font-display font-[900] uppercase leading-[0.8] tracking-[0.01em] text-ink">
            <span className="block text-2xl tracking-[0.18em] sm:text-4xl">Absolute</span>
            <span className="block text-6xl sm:text-8xl">Cinemadle</span>
          </h1>
          <RaisedHand className="w-12 shrink-0 rotate-12 text-ink sm:w-[4.5rem]" />
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
                tag="In development"
                icon={<SoundbytesIcon className="size-24" />}
                href={SITE.games.soundbytes}
              />
            </li>
          </ul>
        </section>
      </main>
      <SiteFooter wide />
    </>
  );
}
