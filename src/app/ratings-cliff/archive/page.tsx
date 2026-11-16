import type { Metadata } from "next";
import Link from "next/link";

import { DayList } from "@/components/ratings-cliff/DayList";
import { SiteFooter } from "@/components/game/SiteFooter";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: "Ratings Cliff archive | Absolute Cinemadle",
  description: "Every Ratings Cliff day so far.",
};

export default function RatingsCliffArchivePage() {
  return (
    <>
      <main className="mx-auto w-full max-w-[34rem] px-4 pb-12 pt-4">
        <nav aria-label="Game navigation">
          <Link
            href={SITE.games.ratingsCliff}
            className="inline-flex min-h-11 items-center gap-2 font-semibold hover:underline"
          >
            <span aria-hidden="true">←</span> Today
          </Link>
        </nav>
        <h1 className="mt-4 font-display text-5xl font-[900] leading-[0.9]">Previous days</h1>
        <div className="mt-6">
          <DayList />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
