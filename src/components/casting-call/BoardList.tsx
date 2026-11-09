"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { readJson } from "@/lib/game/storage";
import type { CastingCallState } from "@/lib/casting-call/state";
import { castingStorageKey } from "./CastingCallGame";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function markFor(boardId: string): string {
  const state = readJson<{ state?: CastingCallState }>(castingStorageKey(boardId))?.state;
  if (state?.status === "won") return `Solved in ${state.guesses.length}`;
  if (state?.status === "lost") return "Finished";
  if (state?.status === "playing") return "In progress";
  return "Play";
}

/** The boards there are to play, each marked if this device has started or finished it. */
export function BoardList({ boards }: { boards: { id: string; name: string }[] }) {
  // Read from this device's storage after hydration; the server renders plain "Play" marks.
  const marks = useSyncExternalStore(
    subscribe,
    () => boards.map((b) => markFor(b.id)).join("|"),
    () => boards.map(() => "Play").join("|"),
  ).split("|");

  return (
    <ul className="flex flex-col gap-2">
      {boards.map((b, i) => (
        <li key={b.id}>
          <Link
            href={`/casting-call/${b.id}`}
            className="flex min-h-14 items-center justify-between gap-3 rounded-[6px] bg-surface px-4 ring-1 ring-ink/15 hover:ring-ink"
          >
            <span className="font-display text-2xl font-[850] leading-none">{b.name}</span>
            <span className="text-sm text-ink-soft">
              {marks[i]} <span aria-hidden="true">→</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
