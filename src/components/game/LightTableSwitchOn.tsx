"use client";

import { useState, useSyncExternalStore } from "react";

const storageKey = (date: string) => `cinemadle:lights-on:${date}`;

/** True only the first time this browser opens a given day's puzzle; remembered in localStorage. */
function firstVisitToday(date: string): boolean {
  try {
    if (window.localStorage.getItem(storageKey(date))) return false;
    window.localStorage.setItem(storageKey(date), "1");
    return true;
  } catch {
    return false;
  }
}

const noSubscribe = () => () => {};
const visits = new Map<string, boolean>();

/**
 * The light table flickering on, like a fluorescent tube starting, the first
 * time a player opens the day's puzzle. Later visits show nothing.
 */
export function LightTableSwitchOn({ date }: { date: string }) {
  const show = useSyncExternalStore(
    noSubscribe,
    () => {
      if (!visits.has(date)) visits.set(date, firstVisitToday(date));
      return visits.get(date)!;
    },
    () => false,
  );
  const [done, setDone] = useState(false);
  if (!show || done) return null;
  return (
    <div
      aria-hidden="true"
      onAnimationEnd={() => setDone(true)}
      className="light-table-switch-on pointer-events-none fixed inset-0 z-30 bg-black"
    />
  );
}
