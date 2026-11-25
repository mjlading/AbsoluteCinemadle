import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/game/SiteFooter";
import { DayList } from "@/components/soundbytes/DayList";

export const metadata: Metadata = {
  title: "Soundbytes archive | Absolute Cinemadle",
  description: "Every Soundbytes board. The game is archived for now.",
};

export default function SoundbytesArchivePage() {
  return (
    <>
      <main className="mx-auto w-full max-w-[34rem] px-4 pb-12 pt-4">
        <nav aria-label="Game navigation">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-semibold hover:underline">
            <span aria-hidden="true">←</span> All games
          </Link>
        </nav>
        <h1 className="mt-4 font-display text-5xl font-[900] leading-[0.9]">Soundbytes</h1>
        <p className="mt-3 text-ink-soft">
          Soundbytes is taking a break: there are no new boards, but every earlier one is still here to play.
        </p>
        <div className="mt-6">
          <DayList />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
