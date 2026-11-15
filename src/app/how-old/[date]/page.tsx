import type { Metadata } from "next";
import { Suspense } from "react";

import { SiteFooter } from "@/components/game/SiteFooter";
import { HowOldGame } from "@/components/how-old/HowOldGame";

export const metadata: Metadata = {
  title: "How Old Were They? | Absolute Cinemadle",
  description: "Five actors, five films: guess how old each actor was when the film came out.",
};

/** An earlier day's board. */
export default function HowOldDayPage({ params }: PageProps<"/how-old/[date]">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={<div className="flex-1" />}>
        <Day params={params} />
      </Suspense>
      <SiteFooter />
    </div>
  );
}

async function Day({ params }: { params: PageProps<"/how-old/[date]">["params"] }) {
  const { date } = await params;
  return <HowOldGame date={date} />;
}
