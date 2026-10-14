import { describe, expect, it } from "vitest";

import { dominantColor, fromHex, sortByHue, toHex, toHsl } from "./palette";

const fill = (rgb: [number, number, number], count: number) => Array.from({ length: count }, () => rgb).flat();

describe("dominantColor", () => {
  it("finds the colour that covers most of the image", () => {
    const pixels = [...fill([200, 30, 30], 60), ...fill([20, 20, 200], 30), ...fill([240, 240, 240], 10)];
    expect(dominantColor(pixels)).toEqual([200, 30, 30]);
  });

  it("averages slight variations within the winning cluster", () => {
    const pixels = [...fill([100, 150, 50], 20), ...fill([110, 160, 60], 20), ...fill([0, 0, 0], 10)];
    expect(dominantColor(pixels)).toEqual([105, 155, 55]);
  });

  it("looks past shadows unless the frame is nearly all shadow", () => {
    expect(dominantColor([...fill([5, 5, 5], 70), ...fill([180, 90, 40], 30)])).toEqual([180, 90, 40]);
    expect(dominantColor([...fill([5, 5, 5], 95), ...fill([180, 90, 40], 5)])).toEqual([5, 5, 5]);
  });

  it("is stable for the same input", () => {
    const pixels = Array.from({ length: 300 }, (_, i) => (i * 37) % 256);
    expect(dominantColor(pixels)).toEqual(dominantColor(pixels));
  });
});

describe("colour conversions", () => {
  it("round-trips hex", () => {
    expect(toHex([255, 128, 0])).toBe("#ff8000");
    expect(fromHex("#ff8000")).toEqual([255, 128, 0]);
  });

  it("computes hue, saturation and lightness", () => {
    expect(toHsl([255, 0, 0])).toEqual([0, 1, 0.5]);
    expect(toHsl([0, 0, 255])[0]).toBeCloseTo(240);
    expect(toHsl([128, 128, 128])[1]).toBe(0);
  });
});

describe("sortByHue", () => {
  it("puts neutrals first, dark to light, then walks the colour wheel", () => {
    expect(sortByHue(["#0000ff", "#ffffff", "#ff0000", "#00ff00", "#111111"])).toEqual([
      "#111111",
      "#ffffff",
      "#ff0000",
      "#00ff00",
      "#0000ff",
    ]);
  });

  it("treats very dark colours as neutral even when they have a hue", () => {
    expect(sortByHue(["#c86b2a", "#21180f", "#0b1a24"])).toEqual(["#0b1a24", "#21180f", "#c86b2a"]);
  });
});
