import { describe, expect, it } from "vitest";

import { addDays, dayNumber, formatPuzzleDate, isIsoDate, isPlayableDate, localIsoDate, utcIsoDate } from "./dates";

describe("isIsoDate", () => {
  it("accepts real dates and rejects everything else", () => {
    expect(isIsoDate("2026-10-14")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-1-14")).toBe(false);
    expect(isIsoDate("../etc")).toBe(false);
  });
});

describe("isPlayableDate", () => {
  const now = new Date("2026-10-14T23:30:00Z");

  it("allows today and tomorrow in UTC, since some players are already there", () => {
    expect(isPlayableDate("2026-10-14", now)).toBe(true);
    expect(isPlayableDate("2026-10-15", now)).toBe(true);
    expect(isPlayableDate("2026-10-01", now)).toBe(true);
  });

  it("refuses anything later", () => {
    expect(isPlayableDate("2026-10-16", now)).toBe(false);
    expect(isPlayableDate("2026-13-01", now)).toBe(false);
  });
});

describe("localIsoDate", () => {
  it("uses local calendar fields", () => {
    expect(localIsoDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("formatPuzzleDate", () => {
  it("formats without shifting the day", () => {
    expect(formatPuzzleDate("2026-10-14")).toBe("Wednesday 14 October");
  });
});

describe("addDays", () => {
  it("crosses month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 14)).toBe("2027-01-14");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("utcIsoDate", () => {
  it("uses the UTC calendar day", () => {
    expect(utcIsoDate(new Date("2026-10-14T23:30:00-05:00"))).toBe("2026-10-15");
  });
});

describe("dayNumber", () => {
  it("is 1 on the launch date and counts up one per day, across months", () => {
    expect(dayNumber("2026-11-10", "2026-11-10")).toBe(1);
    expect(dayNumber("2026-11-14", "2026-11-10")).toBe(5);
    expect(dayNumber("2026-12-01", "2026-11-10")).toBe(22);
  });

  it("has no number before the launch", () => {
    expect(dayNumber("2026-11-09", "2026-11-10")).toBeNull();
  });
});
