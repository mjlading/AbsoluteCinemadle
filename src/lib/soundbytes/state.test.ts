import { describe, expect, it } from "vitest";

import { POINTS } from "@/config/scoring";
import {
  canAfford,
  initialSoundbytesState,
  nodeStage,
  soundbytesReducer,
  soundbytesScore,
  type SoundbytesAction,
} from "./state";
import type { PublicSoundNode, PublicSoundbytesBoard } from "./types";

const clip = { url: "/x.wav", seconds: 2 };
const node = (id: string, slot: number, free = false): PublicSoundNode => ({
  id,
  slot,
  label: id,
  category: "dialogue",
  disguise: "helium",
  art: null,
  free,
  clips: { disguised: clip, real: { ...clip, seconds: 6 } },
  buyCost: free ? 0 : 300,
  revealCost: 300,
});
const board: PublicSoundbytesBoard = {
  id: "b",
  name: "Test",
  background: "corkboard",
  nodes: [node("free", 0, true), node("n1", 1), node("n2", 2)],
};
const reducer = soundbytesReducer(board);
const play = (...actions: SoundbytesAction[]) => actions.reduce(reducer, initialSoundbytesState(board));

const film = (tmdbId: number) => ({ kind: "film" as const, tmdbId, title: `Film ${tmdbId}`, year: null });
const actor = (tmdbId: number) => ({ kind: "person" as const, tmdbId, name: `Actor ${tmdbId}` });

describe("soundbytes state", () => {
  it("spends on buys and removals, adds actor bonuses, and refuses what it can't afford", () => {
    const state = play(
      { type: "start" },
      { type: "buy", nodeId: "n1" },
      { type: "reveal", nodeId: "n1" },
      { type: "guess", pick: actor(7), correct: true },
    );
    expect(nodeStage(state, "n1")).toBe("revealed");
    expect(soundbytesScore(board, state)).toBe(POINTS.soundbytes.start - 600 + POINTS.soundbytes.perCorrectActor);
    expect(state.status).toBe("playing");

    // Buying n2 leaves 100, short of its 300 removal.
    const after = play(
      { type: "start" },
      { type: "buy", nodeId: "n1" },
      { type: "reveal", nodeId: "n1" },
      { type: "buy", nodeId: "n2" },
    );
    expect(soundbytesScore(board, after)).toBe(POINTS.soundbytes.start - 900);
    expect(canAfford(board, after, "n2")).toBe(false);
    expect(reducer(after, { type: "reveal", nodeId: "n2" })).toBe(after);
  });

  it("counts nothing before the first tap", () => {
    const state = play({ type: "buy", nodeId: "n1" }, { type: "guess", pick: film(1), correct: false });
    expect(state.bought).toEqual(["free"]);
    expect(state.guesses).toEqual([]);
  });

  it("wins on the right film, loses with 0 points on the last wrong guess, and ignores repeats", () => {
    const won = play({ type: "start" }, { type: "guess", pick: film(1), correct: true });
    expect(won.status).toBe("won");

    const lost = play(
      { type: "start" },
      { type: "guess", pick: film(2), correct: false },
      { type: "guess", pick: film(2), correct: false },
      { type: "guess", pick: actor(3), correct: true },
      { type: "guess", pick: film(4), correct: false },
    );
    expect(lost.guesses).toHaveLength(3);
    expect(lost.status).toBe("lost");
    expect(soundbytesScore(board, lost)).toBe(0);
  });
});
