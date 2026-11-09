import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CollageGame } from "@/components/collage/CollageGame";
import { SiteFooter } from "@/components/game/SiteFooter";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: "Close-Ups | Absolute Cinemadle",
  description: "Guess the film from close-ups that share one keyword.",
};

export default function CloseUpsPuzzlePage({ params }: PageProps<"/close-ups/[puzzleId]">) {
  return (
    <>
      <main className="mx-auto w-full max-w-[34rem] px-4 pb-12 pt-4">
        <nav aria-label="Game navigation">
          <Link
            href={SITE.games.closeUps}
            className="inline-flex min-h-11 items-center gap-2 font-semibold hover:underline"
          >
            <span aria-hidden="true">←</span> All puzzles
          </Link>
        </nav>
        <Suspense fallback={null}>
          <Puzzle params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function Puzzle({ params }: { params: PageProps<"/close-ups/[puzzleId]">["params"] }) {
  const { puzzleId } = await params;
  return <CollageGame puzzleId={puzzleId} />;
}
