import { describe, expect, it } from "vitest";

import { revealOrder } from "./order";
import type { CollageKeyword, CollageTier } from "./types";

const kw = (id: string, tier: CollageTier, free = false): CollageKeyword => ({
  id,
  label: id,
  tier,
  free,
  tiles: [],
});
const ids = (keywords: CollageKeyword[]) => keywords.map((k) => k.id);

describe("revealOrder", () => {
  it("puts the free keyword first and sorts the rest hard, medium, easy", () => {
    const input = [
      kw("e1", "easy"),
      kw("h0", "hard", true),
      kw("m1", "medium"),
      kw("h1", "hard"),
      kw("e2", "easy"),
      kw("m2", "medium"),
    ];
    expect(ids(revealOrder(input))).toEqual(["h0", "h1", "m1", "m2", "e1"]);
  });

  it("keeps the stored order within a tier", () => {
    const input = [kw("f", "easy", true), kw("h2", "hard"), kw("h1", "hard"), kw("h3", "hard"), kw("m1", "medium")];
    expect(ids(revealOrder(input))).toEqual(["f", "h2", "h1", "h3", "m1"]);
  });

  it("keeps only the first 5", () => {
    const input = [
      kw("a", "easy"),
      kw("b", "easy"),
      kw("c", "easy", true),
      kw("d", "easy"),
      kw("e", "easy"),
      kw("f", "easy"),
    ];
    expect(ids(revealOrder(input))).toEqual(["c", "a", "b", "d", "e"]);
  });
});
