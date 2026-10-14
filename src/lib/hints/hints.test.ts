import { describe, expect, it } from "vitest";

import { SAMPLE_FILMS } from "@/lib/puzzle/sample-puzzle";
import { blankNames } from "./blank-names";
import { pickHint } from "./pick";
import { formatSeconds, parseSeconds, parseYoutubeId } from "./youtube";

describe("parseYoutubeId", () => {
  it("reads ids from the usual link shapes", () => {
    const id = "U1fu_sA7XhE";
    for (const link of [
      id,
      `https://www.youtube.com/watch?v=${id}&t=42s`,
      `https://youtu.be/${id}?si=abc`,
      `youtube.com/embed/${id}`,
      `https://m.youtube.com/shorts/${id}`,
      `https://www.youtube-nocookie.com/embed/${id}`,
    ]) {
      expect(parseYoutubeId(link)).toBe(id);
    }
  });

  it("rejects anything else", () => {
    expect(parseYoutubeId("https://vimeo.com/123")).toBeNull();
    expect(parseYoutubeId("not a link")).toBeNull();
    expect(parseYoutubeId("https://youtube.com/watch?v=short")).toBeNull();
  });
});

describe("seconds", () => {
  it("parses minutes and decimals", () => {
    expect(parseSeconds("1:23.5")).toBe(83.5);
    expect(parseSeconds("83")).toBe(83);
    expect(parseSeconds("1:02:03")).toBe(3723);
    expect(parseSeconds("abc")).toBeNull();
    expect(formatSeconds(83.5)).toBe("1:23.5");
    expect(formatSeconds(5)).toBe("0:05");
  });
});

describe("blankNames", () => {
  const names = {
    titles: ["Jaws"],
    actors: ["Roy Scheider", "Robert Shaw"],
    characters: ["Martin Brody", "Quint"],
    directors: ["Steven Spielberg"],
  };

  it("replaces titles, people and characters, full names first", () => {
    expect(blankNames("Spielberg's Jaws is great; Roy Scheider as Brody and Shaw as Quint steal it.", names)).toBe(
      "[director]'s [film] is great; [actor] as [character] and [actor] as [character] steal it.",
    );
  });

  it("ignores case and accents but only matches whole words", () => {
    expect(blankNames("JAWS! Not jawsome, though.", names)).toBe("[film]! Not jawsome, though.");
    expect(blankNames("Amélie charms.", { titles: ["Amelie"], actors: [], characters: [], directors: [] })).toBe(
      "[film] charms.",
    );
  });
});

describe("pickHint", () => {
  const films = SAMPLE_FILMS.map((film, i) => ({
    ...film,
    soundHint: null,
    reviewHint: i === 2 ? null : { excerpt: `About film ${film.tmdbId}`, author: "someone" },
  }));
  const hinted = films.filter((f) => f.reviewHint).map((f) => f.tmdbId);
  const filmOf = (hint: { excerpt: string } | null) => Number(hint?.excerpt.split(" ").at(-1));

  it("gives every hint once, and only from films that have one", () => {
    const seen: number[] = [];
    const given: number[] = [];
    for (let i = 0; i < hinted.length; i++) {
      const hint = pickHint(films, "reviewHint", "seed", [], seen)!;
      seen.push(hint.token);
      given.push(filmOf(hint));
    }
    expect(given.toSorted()).toEqual(hinted.toSorted());
    expect(pickHint(films, "reviewHint", "seed", [], seen)).toBeNull();
  });

  it("skips solved films, and keeps tokens stable as films are solved", () => {
    const first = pickHint(films, "reviewHint", "seed", [], [])!;
    const solvedFirst = pickHint(films, "reviewHint", "seed", [filmOf(first)], [])!;
    expect(filmOf(solvedFirst)).not.toBe(filmOf(first));

    const second = pickHint(films, "reviewHint", "seed", [], [first.token])!;
    // Solving the first hint's film must not make the second come back under a new token.
    const again = pickHint(films, "reviewHint", "seed", [filmOf(first)], [first.token, second.token]);
    expect(again && filmOf(again)).not.toBe(filmOf(second));
  });

  it("is the same for everyone on the day, and has nothing for a puzzle without hints", () => {
    expect(pickHint(films, "reviewHint", "seed", [], [])).toEqual(pickHint(films, "reviewHint", "seed", [], []));
    expect(pickHint(films, "soundHint", "seed", [], [])).toBeNull();
  });
});
