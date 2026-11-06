import { describe, expect, it } from "vitest";

import { widenCrop } from "./crop";

const frame = { width: 1920, height: 1080 };
/** A 216 px square crop in the middle of the frame. */
const middle = { x: (960 - 108) / 1920, y: (540 - 108) / 1080, width: 216 / 1920, height: 216 / 1080 };

const px = (c: { x: number; y: number; width: number; height: number }) => ({
  left: Math.round(c.x * frame.width),
  top: Math.round(c.y * frame.height),
  width: Math.round(c.width * frame.width),
  height: Math.round(c.height * frame.height),
});

describe("widenCrop", () => {
  it("widens a square crop around its centre and keeps it square in pixels", () => {
    const wide = px(widenCrop(middle, frame, 1.5));
    expect(wide.width).toBe(324);
    expect(wide.height).toBe(324);
    expect(wide.left + wide.width / 2).toBe(960);
    expect(wide.top + wide.height / 2).toBe(540);
  });

  it("shifts back inside the frame at an edge", () => {
    const corner = { x: 0, y: 0, width: 216 / 1920, height: 216 / 1080 };
    const wide = widenCrop(corner, frame, 1.5);
    expect(wide.x).toBe(0);
    expect(wide.y).toBe(0);
    expect(px(wide).width).toBe(324);
  });

  it("never grows past the frame's short side", () => {
    const big = { x: 0.3, y: 0.05, width: 900 / 1920, height: 900 / 1080 };
    const wide = widenCrop(big, frame, 1.5);
    expect(px(wide).height).toBe(1080);
    expect(px(wide).width).toBe(1080);
    expect(wide.y).toBe(0);
    expect(wide.x + wide.width).toBeLessThanOrEqual(1);
  });
});
