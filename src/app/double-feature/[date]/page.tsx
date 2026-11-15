import type { Metadata } from "next";
import { Suspense } from "react";

import { DoubleFeatureGame } from "@/components/double-feature/DoubleFeatureGame";
import { SiteFooter } from "@/components/game/SiteFooter";

export const metadata: Metadata = {
  title: "Double Feature | Absolute Cinemadle",
  description: "Two films, one question: which is longer, cost more, made more, rated higher or came out first?",
};

/** An earlier day's board. */
export default function DoubleFeatureDayPage({ params }: PageProps<"/double-feature/[date]">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={<div className="flex-1" />}>
        <Day params={params} />
      </Suspense>
      <SiteFooter />
    </div>
  );
}

async function Day({ params }: { params: PageProps<"/double-feature/[date]">["params"] }) {
  const { date } = await params;
  return <DoubleFeatureGame date={date} />;
}
