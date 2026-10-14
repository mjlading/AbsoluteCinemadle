"use client";

import { useEffect, useState } from "react";

const START = 3;

/**
 * The academy leader before a reel: a sweeping hand and a number counting down.
 * Calls `onDone` after the last second.
 */
export function FilmLeader({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(START);

  useEffect(() => {
    const timer = window.setTimeout(() => (count > 1 ? setCount(count - 1) : onDone()), 1000);
    return () => window.clearTimeout(timer);
  }, [count, onDone]);

  return (
    <div className="film-leader" role="timer" aria-label={`Starting in ${count}`}>
      <div className="film-leader-sweep" aria-hidden="true" />
      <svg viewBox="0 0 200 200" className="absolute inset-0" aria-hidden="true">
        <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="100" cy="100" r="72" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M100 0V200M0 100H200" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span key={count} className="film-leader-number" aria-hidden="true">
        {count}
      </span>
    </div>
  );
}
