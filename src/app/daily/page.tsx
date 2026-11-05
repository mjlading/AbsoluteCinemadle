import type { Metadata } from "next";
import Link from "next/link";

import { Game } from "@/components/game/Game";
import { SiteFooter } from "@/components/game/SiteFooter";

export const metadata: Metadata = {
  title: "Daily film puzzle | Absolute Cinemadle",
  description: "Play the daily movie puzzle, with a warm-up, a grid and a bonus round.",
};

export default function DailyPage() {
  return (
    <>
      <nav aria-label="Game navigation" className="mx-auto w-full max-w-[34rem] px-4 pt-4">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-semibold hover:underline">
          <span aria-hidden="true">←</span> All games
        </Link>
      </nav>
      <Game />
      <SiteFooter />
    </>
  );
}
