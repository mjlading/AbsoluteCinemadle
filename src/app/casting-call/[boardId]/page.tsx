import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CastingCallGame } from "@/components/casting-call/CastingCallGame";
import { SiteFooter } from "@/components/game/SiteFooter";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: "Casting call | Absolute Cinemadle",
  description: "Eight actors' faces: name films they're in and cross them all out in as few guesses as you can.",
};

export default function CastingCallBoardPage({ params }: PageProps<"/casting-call/[boardId]">) {
  return (
    <>
      <main className="mx-auto w-full max-w-[34rem] px-4 pb-12 pt-4">
        <nav aria-label="Game navigation">
          <Link
            href={SITE.games.castingCall}
            className="inline-flex min-h-11 items-center gap-2 font-semibold hover:underline"
          >
            <span aria-hidden="true">←</span> All boards
          </Link>
        </nav>
        <Suspense fallback={null}>
          <Board params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function Board({ params }: { params: PageProps<"/casting-call/[boardId]">["params"] }) {
  const { boardId } = await params;
  return <CastingCallGame boardId={boardId} />;
}
