import type { Metadata } from "next";
import { Suspense } from "react";

import { SoundbytesGame } from "@/components/soundbytes/SoundbytesGame";
import { SoundbytesShell } from "@/components/soundbytes/SoundbytesShell";

export const metadata: Metadata = {
  title: "Soundbytes | Absolute Cinemadle",
  description: "Name the film by ear, from lines of its dialogue.",
};

/** An earlier day's board, from the archive. */
export default function SoundbytesDayPage({ params }: PageProps<"/soundbytes/[date]">) {
  return (
    <SoundbytesShell>
      <Suspense fallback={<div className="flex-1" />}>
        <Day params={params} />
      </Suspense>
    </SoundbytesShell>
  );
}

async function Day({ params }: { params: PageProps<"/soundbytes/[date]">["params"] }) {
  const { date } = await params;
  return <SoundbytesGame date={date} />;
}
