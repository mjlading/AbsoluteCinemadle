import { describe, expect, it } from "vitest";

import type { PublicPuzzle, SolvedGroup } from "@/lib/puzzle/types";
import {
  canSubmit,
  gridReducer,
  initialGridState,
  isRepeatGuess,
  mistakesLeft,
  type GridAction,
  type GridState,
} from "./grid-state";

const ids = Array.from({ length: 16 }, (_, i) => `t${i + 1}`);
const puzzle: PublicPuzzle = {
  date: "2026-10-14",
  tiles: ids.map((id, i) => ({ id, number: i + 1, type: "still", imageUrl: `/img/${id}` })),
};
const group = (n: number, tier: SolvedGroup["tier"] = 1): SolvedGroup => ({
  filmId: 1000 + n,
  title: `Film ${n}`,
  year: 2000 + n,
  posterUrl: null,
  tier,
  tileIds: ids.slice(n * 4, n * 4 + 4),
});

const run = (state: GridState, ...actions: GridAction[]) => actions.reduce(gridReducer, state);
const select = (...tileIds: string[]): GridAction[] => tileIds.map((tileId) => ({ type: "toggle", tileId }));
const wrong = (tileIds: string[]): GridAction => ({ type: "guess_resolved", tileIds, result: { kind: "wrong" } });

describe("gridReducer", () => {
  it("selects up to four tiles and toggles them off again", () => {
    const state = run(initialGridState(puzzle), ...select("t1", "t2", "t3", "t4", "t5"));
    expect(state.selected).toEqual(["t1", "t2", "t3", "t4"]);
    expect(canSubmit(state)).toBe(true);
    expect(run(state, ...select("t2")).selected).toEqual(["t1", "t3", "t4"]);
    expect(run(state, { type: "deselect_all" }).selected).toEqual([]);
  });

  it("removes a correct group from the grid and clears the selection", () => {
    const state = run(initialGridState(puzzle), ...select(...group(0).tileIds), {
      type: "guess_resolved",
      tileIds: group(0).tileIds,
      result: { kind: "correct", group: group(0) },
    });
    expect(state.solved).toEqual([group(0)]);
    expect(state.order).toEqual(ids.slice(4));
    expect(state.selected).toEqual([]);
    expect(state.status).toBe("playing");
    expect(run(state, ...select("t1")).selected).toEqual([]);
  });

  it("wins once all four groups are found", () => {
    const actions = [0, 1, 2, 3].map((n): GridAction => ({
      type: "guess_resolved",
      tileIds: group(n).tileIds,
      result: { kind: "correct", group: group(n) },
    }));
    const state = run(initialGridState(puzzle), ...actions);
    expect(state.status).toBe("won");
    expect(state.order).toEqual([]);
  });

  it("counts one-away and wrong guesses as mistakes, keeping the selection", () => {
    const guess = ["t1", "t2", "t3", "t5"];
    const state = run(initialGridState(puzzle), ...select(...guess), {
      type: "guess_resolved",
      tileIds: guess,
      result: { kind: "one_away" },
    });
    expect(state.mistakes).toBe(1);
    expect(mistakesLeft(state)).toBe(3);
    expect(state.selected).toEqual(guess);
    expect(isRepeatGuess(state, ["t5", "t3", "t2", "t1"])).toBe(true);
    expect(isRepeatGuess(state, ["t1", "t2", "t3", "t6"])).toBe(false);
  });

  it("loses on the fourth mistake and then only accepts revealed groups", () => {
    let state = run(
      initialGridState(puzzle),
      wrong(["t1", "t5", "t9", "t13"]),
      wrong(["t2", "t6", "t10", "t14"]),
      wrong(["t3", "t7", "t11", "t15"]),
    );
    expect(state.status).toBe("playing");
    state = run(state, ...select("t4", "t8", "t12", "t16"), wrong(["t4", "t8", "t12", "t16"]));
    expect(state.status).toBe("lost");
    expect(state.selected).toEqual([]);
    expect(run(state, ...select("t1")).selected).toEqual([]);

    state = run(state, { type: "group_revealed", group: group(2, 3) }, { type: "group_revealed", group: group(2, 3) });
    expect(state.revealed).toEqual([group(2, 3)]);
    expect(state.order).not.toContain("t9");
  });

  it("ignores revealed groups while still playing", () => {
    const state = initialGridState(puzzle);
    expect(gridReducer(state, { type: "group_revealed", group: group(0) })).toBe(state);
  });

  it("records flipped labels", () => {
    const state = run(initialGridState(puzzle), { type: "label_revealed", tileId: "t3", label: "Roy Scheider" });
    expect(state.labels).toEqual({ t3: "Roy Scheider" });
  });

  it("shuffles the remaining tiles deterministically", () => {
    const shuffled = run(initialGridState(puzzle), { type: "shuffle", seed: "a" });
    expect([...shuffled.order].sort()).toEqual([...ids].sort());
    expect(shuffled.order).not.toEqual(ids);
    expect(run(initialGridState(puzzle), { type: "shuffle", seed: "a" }).order).toEqual(shuffled.order);
  });
});
