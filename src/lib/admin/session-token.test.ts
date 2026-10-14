import { describe, expect, it } from "vitest";

import { passwordMatches, signSession, verifySession } from "./session-token";

const secret = "x".repeat(32);
const now = Date.UTC(2026, 9, 14);

describe("admin session tokens", () => {
  it("accepts a fresh token signed with the same secret", () => {
    expect(verifySession(signSession(secret, now), secret, now + 1000)).toBe(true);
  });

  it("rejects expired, tampered, foreign and missing tokens", () => {
    const token = signSession(secret, now);
    expect(verifySession(token, secret, now + 31 * 86_400_000)).toBe(false);
    expect(verifySession(token.replace(/^\d+/, String(now + 99 * 86_400_000)), secret, now)).toBe(false);
    expect(verifySession(token, "y".repeat(32), now)).toBe(false);
    expect(verifySession(undefined, secret, now)).toBe(false);
    expect(verifySession("garbage", secret, now)).toBe(false);
  });
});

describe("passwordMatches", () => {
  it("matches only the configured password", () => {
    expect(passwordMatches("hunter2", "hunter2")).toBe(true);
    expect(passwordMatches("hunter3", "hunter2")).toBe(false);
    expect(passwordMatches("", undefined)).toBe(false);
    expect(passwordMatches("", "")).toBe(false);
  });
});
