import type { Metadata } from "next";
import { Suspense } from "react";

import { CastingCallGame } from "@/components/casting-call/CastingCallGame";
import { CastingCallShell } from "@/components/casting-call/CastingCallShell";

export const metadata: Metadata = {
  title: "Casting call | Absolute Cinemadle",
  description: "Eight actors' faces: name films they're in and cross them all out in as few guesses as you can.",
};

/** An earlier day's board, from the archive. */
export default function CastingCallDayPage({ params }: PageProps<"/casting-call/[date]">) {
  return (
    <CastingCallShell>
      <Suspense fallback={<div className="flex-1" />}>
        <Day params={params} />
      </Suspense>
    </CastingCallShell>
  );
}

async function Day({ params }: { params: PageProps<"/casting-call/[date]">["params"] }) {
  const { date } = await params;
  return <CastingCallGame date={date} />;
}
