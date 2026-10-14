import type { ReactNode } from "react";

import { SiteHeader } from "./SiteHeader";

/** The page frame around a game, shared by the live game and the admin preview so they look the same. */
export function GameFrame({ date, children }: { date: string | null; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[34rem] px-4 pb-12 pt-5">
      <SiteHeader date={date} />
      {children}
    </main>
  );
}
