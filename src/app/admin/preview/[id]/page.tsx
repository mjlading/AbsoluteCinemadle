import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { GameFrame } from "@/components/game/GameFrame";
import { SiteFooter } from "@/components/game/SiteFooter";
import { GridRound } from "@/components/grid/GridRound";
import { requireAdmin } from "@/lib/admin/auth";
import { utcIsoDate } from "@/lib/dates";
import { checkGrid, toPublicPuzzle } from "@/lib/puzzle/grid";
import { loadPuzzle } from "@/lib/puzzle/repository";

export const metadata: Metadata = { title: "Preview | Absolute Cinemadle", robots: { index: false } };

/** The puzzle exactly as players will see it, played against the admin API so drafts work too. */
export default function PreviewPage({ params }: PageProps<"/admin/preview/[id]">) {
  return (
    <Suspense fallback={<p className="p-4 text-ink-soft">Loading the preview&hellip;</p>}>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: { params: PageProps<"/admin/preview/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const puzzle = z.uuid().safeParse(id).success ? await loadPuzzle(id) : null;
  if (!puzzle) notFound();

  const date = puzzle.date ?? utcIsoDate();
  const apiBase = `/api/admin/puzzles/${puzzle.id}`;
  const { errors } = checkGrid(puzzle);

  return (
    <>
      <div className="bg-ink text-sm text-table">
        <div className="mx-auto flex max-w-[34rem] flex-wrap items-center justify-between gap-2 px-4 py-2">
          <span>Preview{puzzle.date ? "" : " of a draft"}. Nothing you do here is saved.</span>
          <Link href={`/admin/puzzles/${puzzle.id}`} className="font-semibold underline underline-offset-2">
            Back to the editor
          </Link>
        </div>
      </div>
      <GameFrame date={date}>
        {errors.length > 0 ? (
          <p className="mt-10">The grid is not complete yet: {errors.join(" ")}</p>
        ) : (
          <GridRound puzzle={toPublicPuzzle(puzzle, apiBase, date)} apiBase={apiBase} />
        )}
      </GameFrame>
      <SiteFooter />
    </>
  );
}
