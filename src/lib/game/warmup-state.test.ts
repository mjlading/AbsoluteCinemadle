import { describe, expect, it } from "vitest";

import type { PublicWarmupCard, WarmupAnswer } from "@/lib/puzzle/types";
import {
  currentCardId,
  foundCount,
  initialWarmupState,
  warmupReducer,
  type WarmupAction,
  type WarmupState,
} from "./warmup-state";

const cards: PublicWarmupCard[] = ["a", "b", "c"].map((id) => ({
  id,
  foreignTitle: `Title ${id}`,
  language: "es",
  languageName: "Spanish",
  countryName: "Mexico",
  literalTranslation: `Literal ${id}`,
}));
const answer = (cardId: string): WarmupAnswer => ({ cardId, title: `Film ${cardId}`, year: 2000, posterUrl: null });
const run = (state: WarmupState, ...actions: WarmupAction[]) => actions.reduce(warmupReducer, state);
const playing = () => run(initialWarmupState(cards), { type: "start" }, { type: "begin", now: 1000 });

describe("warmupReducer", () => {
  it("goes from intro through the countdown into a 60-second round", () => {
    const state = playing();
    expect(state.phase).toBe("playing");
    expect(state.endsAt).toBe(61_000);
    expect(currentCardId(state)).toBe("a");
  });

  it("ignores play before the clock starts", () => {
    const state = run(initialWarmupState(cards), { type: "found", cardId: "a", answer: answer("a") }, { type: "skip" });
    expect(state.found).toEqual({});
    expect(state.queue).toEqual(["a", "b", "c"]);
  });

  it("sends skipped cards to the back of the queue", () => {
    const state = run(playing(), { type: "skip" }, { type: "skip" });
    expect(state.queue).toEqual(["c", "a", "b"]);
    expect(state.skipped).toEqual(["a", "b"]);
  });

  it("ends the round early once every card is found", () => {
    const state = run(
      playing(),
      { type: "found", cardId: "a", answer: answer("a") },
      { type: "wrong" },
      { type: "found", cardId: "b", answer: answer("b") },
      { type: "found", cardId: "c", answer: answer("c") },
    );
    expect(state.phase).toBe("over");
    expect(foundCount(state)).toBe(3);
    expect(state.wrongGuesses).toBe(1);
  });

  it("reveals only the missed cards when time runs out", () => {
    const state = run(
      playing(),
      { type: "found", cardId: "b", answer: answer("b") },
      { type: "end" },
      { type: "reveal", answers: [answer("a"), answer("b"), answer("c")] },
    );
    expect(Object.keys(state.revealed)).toEqual(["a", "c"]);
    expect(run(state, { type: "found", cardId: "a", answer: answer("a") }).found).toEqual({ b: answer("b") });
  });
});
