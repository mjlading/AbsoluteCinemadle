import { describe, expect, it } from "vitest";

import {
  correctActors,
  initialSoundbytesState,
  lineMarks,
  linesOpen,
  soundbytesReducer,
  triesLeft,
  wonOnLine,
  type SoundbytesAction,
} from "./state";
import type { PublicSoundbytesBoard, SoundNode } from "./types";

const node = (slot: number): SoundNode => ({
  id: `n${slot}`,
  slot,
  label: `Line ${slot + 1}`,
  category: "dialogue",
  art: null,
  clip: { url: `/n${slot}.mp3`, seconds: 4 },
});
const board: PublicSoundbytesBoard = { id: "b", name: "Test", date: null, nodes: [0, 1, 2, 3, 4].map(node) };
const reducer = soundbytesReducer(board);
const play = (...actions: SoundbytesAction[]) => actions.reduce(reducer, initialSoundbytesState());

const film = (tmdbId: number) => ({ kind: "film" as const, tmdbId, title: `Film ${tmdbId}`, year: null });
const actor = (tmdbId: number) => ({ kind: "person" as const, tmdbId, name: `Actor ${tmdbId}` });
const wrong = (tmdbId: number): SoundbytesAction => ({ type: "guess", pick: film(tmdbId), correct: false });

describe("soundbytes state", () => {
  it("starts with line 1 open and every try left, and counts nothing before the first tap", () => {
    const fresh = play(wrong(1), { type: "skip" });
    expect(fresh.guesses).toEqual([]);
    expect(linesOpen(board, fresh)).toBe(1);
    expect(triesLeft(board, fresh)).toBe(5);
  });

  it("opens the next line on each wrong guess or skip", () => {
    const state = play({ type: "start" }, wrong(1), { type: "skip" });
    expect(linesOpen(board, state)).toBe(3);
    expect(triesLeft(board, state)).toBe(3);
    expect(state.status).toBe("playing");
  });

  it("wins on the right film, on the line it was named on", () => {
    const state = play({ type: "start" }, wrong(1), { type: "skip" }, { type: "guess", pick: film(9), correct: true });
    expect(state.status).toBe("won");
    expect(wonOnLine(state)).toBe(3);
    expect(linesOpen(board, state)).toBe(5); // all open once the game is over
  });

  it("lets a right actor go free and pins it, but only the film wins", () => {
    const state = play({ type: "start" }, { type: "guess", pick: actor(7), correct: true });
    expect(state.status).toBe("playing");
    expect(linesOpen(board, state)).toBe(1);
    expect(triesLeft(board, state)).toBe(5);
    expect(correctActors(state).map((g) => g.name)).toEqual(["Actor 7"]);
  });

  it("is lost when a miss comes with every line open, and ignores repeated guesses", () => {
    const four = play({ type: "start" }, wrong(1), wrong(1), wrong(2), { type: "skip" }, wrong(3));
    expect(four.guesses).toHaveLength(4); // the repeat of film 1 was turned away
    expect(linesOpen(board, four)).toBe(5);
    expect(four.status).toBe("playing");

    const lost = reducer(four, { type: "skip" });
    expect(lost.status).toBe("lost");
    expect(triesLeft(board, lost)).toBe(0);
  });

  it("takes no more tries once over", () => {
    const lost = play({ type: "start" }, ...Array.from({ length: 5 }, () => ({ type: "skip" }) as const));
    expect(lost.status).toBe("lost");
    expect(reducer(lost, { type: "skip" })).toBe(lost);
  });

  it("marks each line's try for the board's labels", () => {
    expect(lineMarks(board, play({ type: "start" }))).toEqual(["current", "locked", "locked", "locked", "locked"]);
    const two = play({ type: "start" }, wrong(1), { type: "skip" });
    expect(lineMarks(board, two)).toEqual(["spent", "spent", "current", "locked", "locked"]);
    const won = reducer(two, { type: "guess", pick: film(9), correct: true });
    expect(lineMarks(board, won)).toEqual(["spent", "spent", "won", "locked", "locked"]);
    const lost = play({ type: "start" }, ...Array.from({ length: 5 }, () => ({ type: "skip" }) as const));
    expect(lineMarks(board, lost)).toEqual(["spent", "spent", "spent", "spent", "spent"]);
  });
});
