import { describe, expect, it } from "vitest";

import { MIN_FLIP_S, REST, nextMouth, openFor, voiceAt, type Mouth } from "./mouth";
import { MOUTH_FPS } from "./types";

/** Plays a mouth track frame by frame and returns each pose. */
function play(mouth: string): Mouth[] {
  const clip = { url: "/x.mp3", seconds: mouth.length / MOUTH_FPS, mouth };
  const poses: Mouth[] = [];
  let pose = REST;
  for (let f = 0; f < mouth.length; f++) {
    const t = f / MOUTH_FPS;
    pose = nextMouth(pose, voiceAt(clip, t), t);
    poses.push(pose);
  }
  return poses;
}

describe("mouth", () => {
  it("snaps between shut, half and wide open, with nothing in between", () => {
    expect([0, 1, 2, 3, 5, 6, 9].map((d) => openFor(d / 9))).toEqual([0, 0, 0, 0.5, 0.5, 1, 1]);
  });

  it("follows the mouth track and flips the head on each new syllable", () => {
    const poses = play("0099000099000077");
    expect(poses.map((p) => p.open)).toEqual([0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1]);
    expect(poses.map((p) => p.side)).toEqual([1, 1, -1, -1, -1, -1, -1, -1, 1, 1, 1, 1, 1, 1, -1, -1]);
  });

  it("keeps the head still when syllables come faster than it can flip", () => {
    const gap = Math.floor(MIN_FLIP_S * MOUTH_FPS) - 1;
    const fast = "9" + "0".repeat(gap) + "9";
    const sides = play(fast).map((p) => p.side);
    expect(sides[0]).toBe(-1);
    expect(sides.at(-1)).toBe(-1);
  });

  it("swings the head as far as the voice is loud, easing rather than jumping", () => {
    const loud = play("9".repeat(25));
    // The clip starts at rest; a frame later the head has started to swing, but only a little.
    expect(loud[0].sway).toBe(0);
    expect(loud[1].sway).toBeGreaterThan(0);
    expect(loud[1].sway).toBeLessThan(0.5);
    expect(loud.at(-1)!.sway).toBeGreaterThan(0.95);
    // Each frame moves a little further, never past the loudness.
    for (let f = 1; f < loud.length; f++) expect(loud[f].sway).toBeGreaterThan(loud[f - 1].sway);
    expect(loud.at(-1)!.sway).toBeLessThanOrEqual(1);

    const quiet = play("3".repeat(25));
    expect(quiet.at(-1)!.sway).toBeCloseTo(3 / 9, 1);

    const fading = play("9".repeat(25) + "0".repeat(25));
    expect(fading.at(-1)!.sway).toBeLessThan(0.05);
  });

  it("is shut past the end of the track, and moves to a made-up rhythm without one", () => {
    expect(voiceAt({ url: "/x.mp3", seconds: 1, mouth: "99" }, 5)).toBe(0);
    // Its phrases pause between 2.6 and 3.4 seconds in.
    const levels = Array.from({ length: 100 }, (_, i) => voiceAt({ url: "/x.mp3", seconds: 4 }, i / 25));
    expect(Math.max(...levels)).toBeGreaterThan(0.5);
    expect(Math.min(...levels)).toBeLessThan(0.1);
  });
});
