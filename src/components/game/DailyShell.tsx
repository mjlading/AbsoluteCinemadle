import type { ReactNode } from "react";

import { SiteFooter } from "@/components/game/SiteFooter";

/** The top bar and the board, then the footer, which credits TMDB for the faces. */
export function CastingCallShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      {children}
      <SiteFooter />
    </div>
  );
}
