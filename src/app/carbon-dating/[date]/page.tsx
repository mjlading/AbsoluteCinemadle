import type { Metadata } from "next";
import { Suspense } from "react";

import { CarbonDatingGame } from "@/components/carbon-dating/CarbonDatingGame";
import { SiteFooter } from "@/components/game/SiteFooter";

export const metadata: Metadata = {
  title: "Carbon Dating | Absolute Cinemadle",
  description: "Five film stills from five decades: date each one to its release year by its look.",
};

/** An earlier day's board. */
export default function CarbonDatingDayPage({ params }: PageProps<"/carbon-dating/[date]">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={<div className="flex-1" />}>
        <Day params={params} />
      </Suspense>
      <SiteFooter />
    </div>
  );
}

async function Day({ params }: { params: PageProps<"/carbon-dating/[date]">["params"] }) {
  const { date } = await params;
  return <CarbonDatingGame date={date} />;
}
