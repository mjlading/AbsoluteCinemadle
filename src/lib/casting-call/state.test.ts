import { describe, expect, it } from "vitest";

import { RULES } from "@/config/rules";
import {
  alreadyGuessed,
  castingCallReducer,
  castingShareText,
  firesLeft,
  guessesLeft,
  initialCastingCallState,
  msLeft,
  newlyCrossed,
  reviveCastingCallState,
  type CastingCallAction,
  type CastingCallState,
} from "./state";

const LIMIT = RULES.castingCall.timeLimitSeconds * 1000;
const reducer = castingCallReducer(4);
const faces = ["0", "1", "2", "3"].map((faceId) => ({ faceId, name: `Actor ${faceId}` }));
const start: CastingCallAction = { type: "start", now: 0, faces };
const play = (...actions: CastingCallAction[]) => actions.reduce(reducer, initialCastingCallState());
const guess = (tmdbId: number, ...faceIds: string[]): CastingCallAction => ({
  type: "guess",
  now: tmdbId * 1000,
  result: {
    film: { tmdbId, title: `Film ${tmdbId}`, year: null },
    found: faceIds.map((faceId) => ({ faceId, name: `Actor ${faceId}` })),
  },
});

describe("casting call state", () => {
  it("waits for Start, with no names and a full bar", () => {
    const state = play();
    expect(state.status).toBe("ready");
    expect(state.names).toEqual({});
    expect(msLeft(state, 123456)).toBe(LIMIT);
    expect(reducer(state, guess(1, "0"))).toBe(state);
  });

  it("names every face and starts the clock on Start", () => {
    const state = play(start);
    expect(state.status).toBe("playing");
    expect(state.names["3"]).toBe("Actor 3");
    expect(state.crossed).toEqual([]);
    expect(state.deadline).toBe(LIMIT);
  });

  it("crosses out the faces in each guessed film", () => {
    const state = play(start, guess(1, "0", "2"), guess(2, "2", "3"));
    expect(state.crossed).toEqual(["0", "2", "3"]);
    expect(newlyCrossed(state, 1)).toEqual(["3"]);
    expect(guessesLeft(state)).toBe(RULES.castingCall.maxGuesses - 2);
    expect(state.status).toBe("playing");
  });

  it("refills the bar for a film with someone from the board, counted from when it was submitted", () => {
    expect(play(start, guess(5, "0")).deadline).toBe(5000 + LIMIT);
  });

  it("refills the bar even when everyone in the film was already crossed out", () => {
    expect(play(start, guess(1, "0"), guess(9, "0")).deadline).toBe(9000 + LIMIT);
  });

  it("counts a film with nobody from the board as a guess and leaves the bar alone", () => {
    const state = play(start, guess(1));
    expect(state.guesses).toHaveLength(1);
    expect(state.crossed).toEqual([]);
    expect(state.deadline).toBe(LIMIT);
  });

  it("turns away a film already guessed, for free", () => {
    const once = play(start, guess(1, "0"));
    expect(alreadyGuessed(once, 1)).toBe(true);
    expect(reducer(once, guess(1, "0"))).toBe(once);
  });

  it("wins when every face is crossed out", () => {
    const state = play(start, guess(1, "0", "1"), guess(2, "2", "3"));
    expect(state.status).toBe("won");
    expect(reducer(state, guess(3, "0"))).toBe(state);
    expect(reducer(state, { type: "timeUp" })).toBe(state);
  });

  it("loses when the guesses run out, not to the clock", () => {
    const misses = Array.from({ length: RULES.castingCall.maxGuesses - 1 }, (_, i) => guess(10 + i));
    const lost = play(start, guess(1, "0"), ...misses);
    expect(lost.status).toBe("lost");
    expect(lost.timedOut).toBe(false);
    expect(lost.crossed).toEqual(["0"]);
  });

  it("loses when time runs out", () => {
    const lost = play(start, guess(1, "0"), { type: "timeUp" });
    expect(lost.status).toBe("lost");
    expect(lost.timedOut).toBe(true);
    expect(reducer(lost, guess(2, "1"))).toBe(lost);
  });

  it("reports the time left, never below zero", () => {
    const state = play(start);
    expect(msLeft(state, 1000)).toBe(LIMIT - 1000);
    expect(msLeft(state, LIMIT + 5000)).toBe(0);
  });

  it("restarts a game saved in progress before the clock existed, but keeps finished ones", () => {
    const legacy = { status: "playing", guesses: [], names: {}, crossed: ["0"] } as never;
    expect(reviveCastingCallState(legacy).status).toBe("ready");
    const running = play(start);
    expect(reviveCastingCallState(running)).toBe(running);
    const finished = play(start, { type: "timeUp" });
    expect(reviveCastingCallState(finished)).toBe(finished);
  });

  it("shares the guesses used and a square per guess", () => {
    const won = play(start, guess(1, "0", "1"), guess(2), guess(3, "1"), guess(4, "2", "3"));
    expect(castingShareText("Casting call #6", won)).toBe("Casting call #6 4/6\n🟩🟥🟥🟩⬛⬛");
    const lost = play(start, guess(1, "0"), { type: "timeUp" });
    expect(castingShareText("Casting call #7", lost)).toBe("Casting call #7 X/6\n🟩⬛⬛⬛⬛⬛");
  });

  describe("firing", () => {
    const fire = (faceId: string): CastingCallAction => ({ type: "fire", faceId });

    it("takes an actor off the board as done, without a guess or touching the bar", () => {
      const state = play(start, guess(1, "0"), fire("3"));
      expect(state.fired).toEqual(["3"]);
      expect(state.crossed).toEqual(["0"]);
      expect(state.guesses).toHaveLength(1);
      expect(state.deadline).toBe(1000 + LIMIT);
      expect(firesLeft(state)).toBe(RULES.castingCall.firesPerGame - 1);
    });

    it("allows only so many fires, only while playing, and only someone not done yet", () => {
      expect(play(fire("0")).fired).toEqual([]);
      const once = play(start, fire("0"));
      if (RULES.castingCall.firesPerGame === 1) expect(reducer(once, fire("1"))).toBe(once);
      expect(reducer(once, fire("0"))).toBe(once);
      const crossed = play(start, guess(1, "2"));
      expect(reducer(crossed, fire("2"))).toBe(crossed);
      expect(reducer(play(start), fire("9")).fired).toEqual([]);
    });

    it("counts a fired actor towards the win, and never crosses them out later", () => {
      const state = play(start, fire("3"), guess(1, "0", "1"), guess(2, "2", "3"));
      expect(state.status).toBe("won");
      expect(state.crossed).toEqual(["0", "1", "2"]);
      expect(newlyCrossed(state, 1)).toEqual(["2"]);
    });

    it("wins at once when the last actor left is fired", () => {
      const state = play(start, guess(1, "0", "1", "2"), fire("3"));
      expect(state.status).toBe("won");
      expect(state.guesses).toHaveLength(1);
    });

    it("shows a flame in the share text", () => {
      const state = play(start, guess(1, "0", "1", "2"), fire("3"));
      expect(castingShareText("Casting call #5", state)).toBe("Casting call #5 1/6 🔥\n🟩⬛⬛⬛⬛⬛");
    });

    it("reads games saved before firing existed as having fired nobody", () => {
      const old: Partial<CastingCallState> = { ...play(start, guess(1, "0")) };
      delete old.fired;
      expect(reviveCastingCallState(old as CastingCallState).fired).toEqual([]);
    });
  });
});
