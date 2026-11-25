import { describe, expect, it } from "vitest";

import { hintRank } from "./game";

describe("Warmer hints", () => {
  const order = Array.from({ length: 1000 }, (_, i) => i);

  it("lands halfway to the answer, skips films already guessed, and stops at #2", () => {
    expect(hintRank(order, new Set(), null)).toBe(300);
    expect(hintRank(order, new Set(), 100)).toBe(50);
    expect(hintRank(order, new Set([49]), 100)).toBe(49);
    expect(hintRank(order, new Set(), 3)).toBeNull();
  });
});
