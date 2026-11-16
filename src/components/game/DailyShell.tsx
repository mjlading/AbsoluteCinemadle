import type { ReactNode } from "react";

import { SiteFooter } from "@/components/game/SiteFooter";

/** A daily that scrolls (Casting call, Ratings Cliff): the top bar and the board, then the footer, which credits TMDB. */
export function DailyShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      {children}
      <SiteFooter />
    </div>
  );
}
