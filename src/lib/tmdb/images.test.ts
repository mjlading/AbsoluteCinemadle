import { describe, expect, it } from "vitest";

import { cropToPixels, sourceSizeFor } from "./images";

describe("sourceSizeFor", () => {
  it("picks the smallest size that keeps the crop sharp", () => {
    const half = { x: 0, y: 0, width: 0.5, height: 0.5 };
    expect(sourceSizeFor("backdrop", half, 320)).toBe("w780");
    expect(sourceSizeFor("backdrop", { ...half, width: 0.7 }, 800)).toBe("w1280");
    expect(sourceSizeFor("backdrop", half, 800)).toBe("original");
    expect(sourceSizeFor("backdrop", { ...half, width: 0.2 }, 800)).toBe("original");
    expect(sourceSizeFor("profile", { x: 0, y: 0, width: 1, height: 0.66 }, 320)).toBe("h632");
    expect(sourceSizeFor("profile", { x: 0, y: 0, width: 1, height: 0.66 }, 800)).toBe("original");
  });
});

describe("cropToPixels", () => {
  it("converts fractions to whole pixels inside the image", () => {
    expect(cropToPixels({ x: 0.25, y: 0.1, width: 0.5, height: 0.5 }, 1280, 720)).toEqual({
      left: 320,
      top: 72,
      width: 640,
      height: 360,
    });
  });

  it("clamps crops that spill over the edge", () => {
    expect(cropToPixels({ x: 0.9, y: 0.9, width: 0.5, height: 0.5 }, 100, 100)).toEqual({
      left: 90,
      top: 90,
      width: 10,
      height: 10,
    });
  });
});
