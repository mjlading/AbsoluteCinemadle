import type { Metadata } from "next";
import { Suspense } from "react";

import { RatingsCliffGame } from "@/components/ratings-cliff/RatingsCliffGame";
import { DailyShell } from "@/components/game/DailyShell";

export const metadata: Metadata = {
  title: "Ratings Cliff | Absolute Cinemadle",
  description: "Five TV series, each shown only as a grid of its episodes' ratings: name the show.",
};

/** An earlier day's board, from the archive. */
export default function RatingsCliffDayPage({ params }: PageProps<"/ratings-cliff/[date]">) {
  return (
    <DailyShell>
      <Suspense fallback={<div className="flex-1" />}>
        <Day params={params} />
      </Suspense>
    </DailyShell>
  );
}

async function Day({ params }: { params: PageProps<"/ratings-cliff/[date]">["params"] }) {
  const { date } = await params;
  return <RatingsCliffGame date={date} />;
}
