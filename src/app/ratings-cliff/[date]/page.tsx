import type { Metadata } from "next";
import { Suspense } from "react";

import { SiteFooter } from "@/components/game/SiteFooter";
import { RatingsCliffGame } from "@/components/ratings-cliff/RatingsCliffGame";

export const metadata: Metadata = {
  title: "Ratings Cliff | Absolute Cinemadle",
  description: "Five TV series, each shown only as a chart of its episodes' ratings: name the show.",
};

/** An earlier day's board. */
export default function RatingsCliffDayPage({ params }: PageProps<"/ratings-cliff/[date]">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={<div className="flex-1" />}>
        <Day params={params} />
      </Suspense>
      <SiteFooter />
    </div>
  );
}

async function Day({ params }: { params: PageProps<"/ratings-cliff/[date]">["params"] }) {
  const { date } = await params;
  return <RatingsCliffGame date={date} />;
}
