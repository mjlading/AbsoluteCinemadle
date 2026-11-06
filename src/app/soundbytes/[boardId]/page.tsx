import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SiteFooter } from "@/components/game/SiteFooter";
import { SoundbytesGame } from "@/components/soundbytes/SoundbytesGame";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: "Soundbytes | Absolute Cinemadle",
  description: "Guess the film from its sounds, disguised until you pay to hear them clearly.",
};

export default function SoundbytesBoardPage({ params }: PageProps<"/soundbytes/[boardId]">) {
  return (
    <>
      <main className="mx-auto w-full max-w-[30rem] px-4 pb-12 pt-4">
        <nav aria-label="Game navigation">
          <Link
            href={SITE.games.soundbytes}
            className="inline-flex min-h-11 items-center gap-2 font-semibold hover:underline"
          >
            <span aria-hidden="true">←</span> All boards
          </Link>
        </nav>
        <Suspense fallback={null}>
          <Board params={params} />
        </Suspense>
      </main>
      <SiteFooter narrow />
    </>
  );
}

async function Board({ params }: { params: PageProps<"/soundbytes/[boardId]">["params"] }) {
  const { boardId } = await params;
  return <SoundbytesGame boardId={boardId} />;
}
