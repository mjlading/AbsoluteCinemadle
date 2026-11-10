import "server-only";

import { and, desc, eq, isNotNull, lte } from "drizzle-orm";

import { db } from "@/db/client";
import { soundbytesBoards, soundbytesClips } from "@/db/schema";
import { errorResponse } from "@/lib/http";
import { SoundbytesBoardSchema } from "./board-schema";
import type { SoundbytesBoard, SoundbytesDay } from "./types";

/*
 * Soundbytes boards live in the soundbytes_boards table, with their dialogue
 * clips in soundbytes_clips, loaded from the soundbytes lab's export with
 * `npm run db:import-soundbytes`. Each dated row is one day's board; undated
 * rows are never shown. They hold the answer and clip sources, so they stay on the server.
 */

const toBoard = (row: typeof soundbytesBoards.$inferSelect): SoundbytesBoard =>
  SoundbytesBoardSchema.parse({ id: row.id, name: row.name, date: row.date, answer: row.answer, nodes: row.nodes });

/** Every day with a board, newest first, up to and including `latest`. */
export async function listSoundbytesDays(latest: string): Promise<SoundbytesDay[]> {
  const rows = await db()
    .select({ id: soundbytesBoards.id, date: soundbytesBoards.date })
    .from(soundbytesBoards)
    .where(and(isNotNull(soundbytesBoards.date), lte(soundbytesBoards.date, latest)))
    .orderBy(desc(soundbytesBoards.date));
  return rows.map((r) => ({ id: r.id, date: r.date! }));
}

export async function getBoardByDate(date: string): Promise<SoundbytesBoard | null> {
  const [row] = await db().select().from(soundbytesBoards).where(eq(soundbytesBoards.date, date));
  return row ? toBoard(row) : null;
}

export async function getBoard(id: string): Promise<SoundbytesBoard | null> {
  const [row] = await db().select().from(soundbytesBoards).where(eq(soundbytesBoards.id, id));
  return row ? toBoard(row) : null;
}

/** Loads the board for a route's id param, or the error response to return instead. */
export async function boardOrErrorResponse(id: string): Promise<SoundbytesBoard | Response> {
  return (await getBoard(id)) ?? errorResponse(404, "There is no such board.");
}

/** A clip's audio, only if it belongs to that board. */
export async function getClip(
  boardId: string,
  clipId: string,
): Promise<{ data: Uint8Array; contentType: string } | null> {
  const [row] = await db()
    .select({ data: soundbytesClips.data, contentType: soundbytesClips.contentType })
    .from(soundbytesClips)
    .where(and(eq(soundbytesClips.id, clipId), eq(soundbytesClips.boardId, boardId)));
  return row ? { data: new Uint8Array(row.data), contentType: row.contentType } : null;
}
