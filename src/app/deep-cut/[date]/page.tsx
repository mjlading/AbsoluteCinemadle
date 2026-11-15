import type { Metadata } from "next";
import { Suspense } from "react";

import { DeepCutGame } from "@/components/deep-cut/DeepCutGame";
import { SiteFooter } from "@/components/game/SiteFooter";

export const metadata: Metadata = {
  title: "Deep Cut | Absolute Cinemadle",
  description:
    "Three prompts, many right answers: name a film that fits, and the less obvious it is, the more it scores.",
};

/** An earlier day's prompts. */
export default function DeepCutDayPage({ params }: PageProps<"/deep-cut/[date]">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={<div className="flex-1" />}>
        <Day params={params} />
      </Suspense>
      <SiteFooter />
    </div>
  );
}

async function Day({ params }: { params: PageProps<"/deep-cut/[date]">["params"] }) {
  const { date } = await params;
  return <DeepCutGame date={date} />;
}
