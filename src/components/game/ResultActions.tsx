"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Copies the result as text, and says so on the button for a moment. */
export function ShareButton({ shareText }: { shareText: () => string }) {
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function share() {
    try {
      await navigator.clipboard.writeText(shareText());
      setCopied("yes");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="h-12 flex-1 rounded-xl bg-ink font-semibold text-table transition-colors hover:bg-ink/85"
    >
      {copied === "yes" ? "Copied" : copied === "failed" ? "Couldn't copy" : "Share"}
    </button>
  );
}

/**
 * The two ways on from a finished daily game, the same in every game:
 * Share copies the result as text, and Previous days opens the game's archive.
 */
export function ResultActions({ shareText, archiveHref }: { shareText: () => string; archiveHref: string }) {
  return (
    <div className="flex gap-2">
      <ShareButton shareText={shareText} />
      <Link
        href={archiveHref}
        className="grid h-12 flex-1 place-items-center rounded-xl bg-ink/7 font-condensed text-[17px] font-extrabold tracking-[0.02em] transition-colors hover:bg-ink/12"
      >
        Previous days
      </Link>
    </div>
  );
}
