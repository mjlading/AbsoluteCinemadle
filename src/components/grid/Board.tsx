import type { ReactNode } from "react";

/**
 * The dark contact sheet the frames sit on. Children share the `--gap` and
 * `--tile` custom properties, so tape banners line up with tile rows.
 */
export function Board({ children, overlay, busy = false }: { children: ReactNode; overlay?: ReactNode; busy?: boolean }) {
  return (
    <div className="relative rounded-[6px] bg-sheet p-1.5" aria-busy={busy || undefined}>
      <div className="@container">
        <div className="board-stack flex flex-col gap-(--gap)">{children}</div>
      </div>
      {overlay}
    </div>
  );
}
