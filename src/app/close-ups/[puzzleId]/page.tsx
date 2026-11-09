import type { Metadata } from "next";
import { Suspense } from "react";

import { CollageGame } from "@/components/collage/CollageGame";
import { SiteFooter } from "@/components/game/SiteFooter";

export const metadata: Metadata = {
  title: "Close-Ups | Absolute Cinemadle",
  description: "Guess the film from close-ups that share one keyword.",
};

/**
 * One screen, top to bottom: the top bar, the stage (board, guess row and
 * history) and the footer line. Only very short screens (landscape phones) scroll.
 */
export default function CloseUpsPuzzlePage({ params }: PageProps<"/close-ups/[puzzleId]">) {
  return (
    <div className="flex h-dvh min-h-[36rem] flex-col">
      <Suspense fallback={<div className="flex-1" />}>
        <Puzzle params={params} />
      </Suspense>
      <SiteFooter compact />
    </div>
  );
}

async function Puzzle({ params }: { params: PageProps<"/close-ups/[puzzleId]">["params"] }) {
  const { puzzleId } = await params;
  return <CollageGame puzzleId={puzzleId} />;
}
