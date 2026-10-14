import { describe, expect, it } from "vitest";

import { costMicroUsd, fitsUnderCap, formatUsd, maxInputTokens } from "./cost";

describe("costMicroUsd", () => {
  it("prices Haiku 5.5 tokens and rounds up", () => {
    expect(costMicroUsd({ inputTokens: 1_000_000, outputTokens: 0 })).toBe(100_000);
    expect(costMicroUsd({ inputTokens: 0, outputTokens: 1_000_000 })).toBe(500_000);
    expect(costMicroUsd({ inputTokens: 300, outputTokens: 120 })).toBe(90);
    expect(costMicroUsd({ inputTokens: 1, outputTokens: 0 })).toBe(1);
  });
});

describe("spend cap", () => {
  it("allows a call only if its worst case fits under USD 10", () => {
    expect(fitsUnderCap(9_999_000, 1_000)).toBe(true);
    expect(fitsUnderCap(9_999_000, 1_001)).toBe(false);
  });

  it("over-estimates input tokens from the prompt length", () => {
    expect(maxInputTokens("x".repeat(400))).toBe(500);
  });
});

describe("formatUsd", () => {
  it("shows small amounts with four decimals", () => {
    expect(formatUsd(90)).toBe("$0.0001");
    expect(formatUsd(2_500_000)).toBe("$2.50");
  });
});
