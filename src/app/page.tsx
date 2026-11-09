import { CastingCallArtwork } from "@/components/game-modes/CastingCallArtwork";
import { CloseUpsArtwork } from "@/components/game-modes/CloseUpsArtwork";
import { GameCard } from "@/components/game-modes/GameCard";
import { SoundbytesArtwork } from "@/components/game-modes/SoundbytesArtwork";
import { SiteFooter } from "@/components/game/SiteFooter";
import { SITE } from "@/config/site";

export default function Home() {
  return (
    <>
      <main className="mx-auto w-full max-w-[62rem] px-4 pb-12 pt-10 sm:px-8 sm:pt-16">
        <header className="text-center">
          <h1 className="font-display text-5xl font-[900] leading-[0.85] tracking-[-0.01em] sm:text-7xl">
            Absolute Cinemadle<span className="text-marker">.</span>
          </h1>
          <p className="mt-3 text-ink-soft">Daily games for people who notice the details.</p>
        </header>

        <section aria-label="Games" className="mt-10 sm:mt-14">
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <li>
              <GameCard
                title="Close-Ups"
                blurb="Name the film from four close-ups that share one detail. New every day."
                color="#8fd3e0"
                tag="New"
                icon={<CloseUpsArtwork bare className="w-24 -rotate-3" />}
                href={SITE.games.closeUps}
              />
            </li>
            <li>
              <GameCard
                title="Casting call"
                blurb="Eight actors, one draining clock. Name films they're in to cross them all out."
                color="#f09cc3"
                tag="New"
                icon={<CastingCallArtwork className="w-36" />}
                href={SITE.games.castingCall}
              />
            </li>
            <li>
              <GameCard
                title="Soundbytes"
                blurb="Guess the film by ear, from short clips that start out disguised."
                color="#f2c641"
                tag="In development"
                icon={<SoundbytesArtwork className="w-32" />}
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
