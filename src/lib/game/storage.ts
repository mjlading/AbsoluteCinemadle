"use client";

import { useEffect, useReducer, type Reducer } from "react";

/*
 * Player progress lives in localStorage (there are no accounts). Every read
 * and write is guarded: storage can be full, disabled or private, and the game
 * must still play, just without remembering.
 */

const VERSION = 1;

interface Stored<T> {
  v: number;
  /** Identifies the puzzle content the state belongs to; an edited puzzle invalidates it. */
  signature: string;
  state: T;
}

export function readStored<T>(key: string, signature: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Stored<T>;
    return stored.v === VERSION && stored.signature === signature ? stored.state : null;
  } catch {
    return null;
  }
}

export function writeStored<T>(key: string, signature: string, state: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify({ v: VERSION, signature, state } satisfies Stored<T>));
  } catch {
    // Full or unavailable storage: the game goes on without remembering.
  }
}

export function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // See writeStored.
  }
}

/**
 * useReducer that resumes from localStorage and saves every change. With a
 * null key (the admin preview) it is a plain reducer. Only mount it on the
 * client, after the puzzle has loaded, so the stored state is there on first render.
 */
export function usePersistentReducer<S, A, I>(
  key: string | null,
  signature: string,
  reducer: Reducer<S, A>,
  initialArg: I,
  init: (arg: I) => S,
  revive: (stored: S) => S = (stored) => stored,
) {
  const [state, dispatch] = useReducer(reducer, initialArg, (arg) => {
    const stored = key ? readStored<S>(key, signature) : null;
    return stored ? revive(stored) : init(arg);
  });

  useEffect(() => {
    if (key) writeStored(key, signature, state);
  }, [key, signature, state]);

  return [state, dispatch] as const;
}
