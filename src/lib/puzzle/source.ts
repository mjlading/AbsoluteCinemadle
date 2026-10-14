import "server-only";

import { isPlayableDate } from "@/lib/dates";
import { samplePuzzle } from "./sample-puzzle";
import type { Puzzle } from "./types";

/** The puzzle for a date, or null if there is none or the date is not playable yet. */
export async function getPuzzle(date: string, now: Date = new Date()): Promise<Puzzle | null> {
  if (!isPlayableDate(date, now)) return null;
  // Phase 1: every date serves the bundled sample puzzle.
  return samplePuzzle(date);
}

/** Loads the puzzle for a route's date param, or the error response to return instead. */
export async function puzzleOrErrorResponse(date: string): Promise<Puzzle | Response> {
  const puzzle = await getPuzzle(date);
  return puzzle ?? Response.json({ error: "There is no puzzle for this date." }, { status: 404 });
}
