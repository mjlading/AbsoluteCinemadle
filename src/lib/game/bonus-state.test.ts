import { describe, expect, it } from "vitest";

import type { PublicBonus } from "@/lib/puzzle/types";
import { allAssigned, bonusReducer, correctCount, initialBonusState, type BonusAction } from "./bonus-state";

const bonus: PublicBonus = {
  films: [1, 2].map((filmId) => ({ filmId, title: `Film ${filmId}`, year: 2000, posterUrl: null })),
  barcodes: ["x", "y"].map((id) => ({ id, colors: ["#000000"], imageUrl: null })),
};
const run = (...actions: BonusAction[]) => actions.reduce(bonusReducer, initialBonusState);

describe("bonusReducer", () => {
  it("pairs a film and a barcode in either order", () => {
    expect(run({ type: "pick_film", filmId: 1 }, { type: "pick_barcode", barcodeId: "x" }).assignments).toEqual({
      x: 1,
    });
    expect(run({ type: "pick_barcode", barcodeId: "y" }, { type: "pick_film", filmId: 2 }).assignments).toEqual({
      y: 2,
    });
  });

  it("drops the pick when the same thing is tapped twice", () => {
    expect(run({ type: "pick_film", filmId: 1 }, { type: "pick_film", filmId: 1 }).picked).toBeNull();
  });

  it("moves a film rather than using it twice", () => {
    const state = run({ type: "assign", barcodeId: "x", filmId: 1 }, { type: "assign", barcodeId: "y", filmId: 1 });
    expect(state.assignments).toEqual({ y: 1 });
  });

  it("replaces the film already on a barcode", () => {
    const state = run({ type: "assign", barcodeId: "x", filmId: 1 }, { type: "assign", barcodeId: "x", filmId: 2 });
    expect(state.assignments).toEqual({ x: 2 });
  });

  it("knows when every barcode has a film, and freezes once checked", () => {
    const state = run({ type: "assign", barcodeId: "x", filmId: 1 }, { type: "assign", barcodeId: "y", filmId: 2 });
    expect(allAssigned(state, bonus)).toBe(true);
    const checked = bonusReducer(state, {
      type: "checked",
      results: [
        { barcodeId: "x", filmId: 1, correct: true },
        { barcodeId: "y", filmId: 1, correct: false },
      ],
    });
    expect(correctCount(checked)).toBe(1);
    expect(bonusReducer(checked, { type: "unassign", barcodeId: "x" })).toBe(checked);
  });
});
