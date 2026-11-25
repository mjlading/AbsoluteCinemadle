import type { Metadata } from "next";
import Link from "next/link";

import { WarmerGame } from "@/components/warmer/WarmerGame";

export const metadata: Metadata = {
  title: "Warmer | Absolute Cinemadle",
  description: "Find the hidden film: every guess shows how close you are.",
};

/** Today's hidden film (or `?date=`), in a placeholder look awaiting a design. */
export default function WarmerPage() {
  return (
    <main className="mx-auto w-full max-w-[34rem] px-4 pb-12 pt-4">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-semibold hover:underline">
        <span aria-hidden="true">←</span> All games
      </Link>
      <h1 className="mb-4 mt-2 text-3xl font-bold">Warmer</h1>
      <WarmerGame />
    </main>
  );
}
