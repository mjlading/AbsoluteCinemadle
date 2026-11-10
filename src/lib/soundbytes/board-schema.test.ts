import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { RULES } from "@/config/rules";
import { APPLE_PREVIEW_HOST, SoundbytesBoardSchema, SoundbytesExportSchema } from "./board-schema";
import type { SoundbytesBoard } from "./types";

// The handlers read boards from the database; these tests only need the pure mapping.
vi.mock("@/db/client", () => ({ db: () => null }));
const { toPublicBoard } = await import("./handlers");

const fixture = SoundbytesExportSchema.parse(
  JSON.parse(readFileSync(new URL("../../../e2e/fixtures/soundbytes/boards.json", import.meta.url), "utf8")),
).boards[0];

const APPLE_PREVIEW = `${APPLE_PREVIEW_HOST}itunes-assets/AudioPreview/`;

function withNodes(change: (nodes: SoundbytesBoard["nodes"]) => void): unknown {
  const board = structuredClone(fixture);
  change(board.nodes);
  return board;
}

describe("SoundbytesBoardSchema", () => {
  it("accepts the test board", () => {
    expect(fixture.nodes).toHaveLength(RULES.soundbytes.lines);
  });

  it("needs one line per slot, and exactly as many lines as tries", () => {
    const sameSlot = withNodes((nodes) => {
      nodes[2].slot = 1;
    });
    const short = withNodes((nodes) => {
      nodes.pop();
    });
    expect(SoundbytesBoardSchema.safeParse(sameSlot).success).toBe(false);
    expect(SoundbytesBoardSchema.safeParse(short).success).toBe(false);
  });

  it("refuses audio that isn't MP3 or WAV", () => {
    const board = withNodes((nodes) => {
      nodes[1].clip = { ...nodes[1].clip, contentType: "text/html" };
    });
    expect(SoundbytesBoardSchema.safeParse(board).success).toBe(false);
  });

  it("takes a theme only from Apple's preview servers", () => {
    const theme = (url: string) =>
      withNodes((nodes) => {
        nodes[4].clip = { url, start: 4.5, seconds: 12 };
        nodes[4].source = { kind: "itunes", id: "507536740", at: 4.5 };
      });
    expect(SoundbytesBoardSchema.safeParse(theme(`${APPLE_PREVIEW}mzaf_1.plus.aac.p.m4a`)).success).toBe(true);
    expect(SoundbytesBoardSchema.safeParse(theme("https://example.com/theme.m4a")).success).toBe(false);
  });
});

describe("toPublicBoard", () => {
  const board = SoundbytesBoardSchema.parse(
    withNodes((nodes) => {
      nodes[1].source = { kind: "youtube", id: "Rc_i5TKdmhs", at: 47.3 };
    }),
  );
  const pub = toPublicBoard(board);

  it("sends clips through our own route, under their opaque ids", () => {
    expect(pub.nodes[0].clip).toMatchObject({ url: "/api/soundbytes/fixture1/clips/dialogue-a", seconds: 6 });
    expect(pub.nodes[0].clip.mouth).toMatch(/^[0-9]+$/);
  });

  it("plays a theme straight from Apple, from its window's start", () => {
    const withTheme = SoundbytesBoardSchema.parse(
      withNodes((nodes) => {
        nodes[4].clip = { url: `${APPLE_PREVIEW}mzaf_1.plus.aac.p.m4a`, start: 4.5, seconds: 12 };
        nodes[4].source = { kind: "itunes", id: "507536740", at: 4.5 };
      }),
    );
    expect(toPublicBoard(withTheme).nodes[4].clip).toEqual({
      url: `${APPLE_PREVIEW}mzaf_1.plus.aac.p.m4a`,
      start: 4.5,
      seconds: 12,
    });
    expect(JSON.stringify(toPublicBoard(withTheme))).not.toContain("507536740");
  });

  it("never sends the answer or where a clip came from", () => {
    const sent = JSON.stringify(pub);
    expect(sent).not.toContain("source");
    expect(sent).not.toContain("Rc_i5TKdmhs");
    expect(sent).not.toContain("Jurassic");
    expect(sent).not.toContain("placeholder");
  });
});
