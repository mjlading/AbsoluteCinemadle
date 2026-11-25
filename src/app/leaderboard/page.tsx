import type { Metadata } from "next";
import Link from "next/link";

import { AllTimeLeaderboard } from "@/components/leaderboard/AllTimeLeaderboard";
import { SiteFooter } from "@/components/game/SiteFooter";

export const metadata: Metadata = {
  title: "Leaderboard | Absolute Cinemadle",
  description: "Everyone's totals over every daily.",
};

/** Placeholder page (the look is still to be designed): all-time totals, overall and per game. */
export default function LeaderboardPage() {
  return (
    <>
      <main className="mx-auto w-full max-w-[40rem] px-4 pb-12 pt-4">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-semibold hover:underline">
          <span aria-hidden="true">←</span> All games
        </Link>
        <h1 className="mt-4 text-3xl font-bold">All-time leaderboard</h1>
        <AllTimeLeaderboard />
      </main>
      <SiteFooter />
    </>
  );
}
