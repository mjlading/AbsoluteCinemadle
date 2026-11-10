import type { Metadata } from "next";
import { Suspense } from "react";

import { CollageGame } from "@/components/collage/CollageGame";
import { GameShell } from "@/components/collage/GameShell";

export const metadata: Metadata = {
  title: "Close-Ups | Absolute Cinemadle",
  description: "Name the film from close-ups that share one detail.",
};

/** An earlier day's puzzle, from the archive. */
export default function CloseUpsDayPage({ params }: PageProps<"/close-ups/[date]">) {
  return (
    <GameShell>
      <Suspense fallback={<div className="flex-1" />}>
        <Day params={params} />
      </Suspense>
    </GameShell>
  );
}

async function Day({ params }: { params: PageProps<"/close-ups/[date]">["params"] }) {
  const { date } = await params;
  return <CollageGame date={date} />;
}
