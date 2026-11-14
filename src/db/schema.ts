import { customType, date, jsonb, pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core";

import type { BoardPair } from "@/lib/casting-call/generate";
import type { CollageKeyword, CollagePuzzle } from "@/lib/collage/types";
import type { SoundbytesBoard, StoredSoundNode } from "@/lib/soundbytes/types";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/**
 * Keyword collage puzzles, curated in the collage lab and loaded with `npm run db:import-collage`.
 * A puzzle's keywords and tiles are one JSON document, validated on the way in and out
 * (src/lib/collage/puzzle-schema.ts). The answer and TMDB paths never leave the server.
 * They are TMDB data, so `synced_at` dates them for the 6-month limit.
 */
export const collagePuzzles = pgTable("collage_puzzles", {
  /** Opaque id, used in the puzzle's URL. */
  id: text("id").primaryKey(),
  /** Spoiler-free name for the puzzle list, e.g. "Demo 1". */
  name: text("name").notNull(),
  /** Order in the puzzle list. */
  position: smallint("position").notNull(),
  /** The day this is Close-Ups' daily puzzle (YYYY-MM-DD); undated puzzles (the old demos) are never shown. */
  date: date("date", { mode: "string" }).unique(),
  answer: jsonb("answer").$type<CollagePuzzle["answer"]>().notNull(),
  keywords: jsonb("keywords").$type<CollageKeyword[]>().notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Soundbytes boards, built by the soundbytes lab and loaded with `npm run db:import-soundbytes`.
 * A board's nodes are one JSON document, validated on the way in and out
 * (src/lib/soundbytes/board-schema.ts). The answer, cast and clip sources never leave the server.
 * The answer is TMDB data, so `synced_at` dates it for the 6-month limit.
 */
export const soundbytesBoards = pgTable("soundbytes_boards", {
  /** Opaque id, used in the board's URL. */
  id: text("id").primaryKey(),
  /** Spoiler-free name, e.g. "Demo 1"; players see the day's number instead. */
  name: text("name").notNull(),
  /** Order in the imported file. */
  position: smallint("position").notNull(),
  /** The day it is the daily board (YYYY-MM-DD); undated boards are never shown to players. */
  date: date("date", { mode: "string" }).unique(),
  answer: jsonb("answer").$type<SoundbytesBoard["answer"]>().notNull(),
  nodes: jsonb("nodes").$type<StoredSoundNode[]>().notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

/** The audio of a board's dialogue clips: a few seconds each, with no metadata, served under the clip's opaque id. */
export const soundbytesClips = pgTable("soundbytes_clips", {
  id: text("id").primaryKey(),
  boardId: text("board_id")
    .notNull()
    .references(() => soundbytesBoards.id, { onDelete: "cascade" }),
  contentType: text("content_type").notNull(),
  data: bytea("data").notNull(),
});

/**
 * Casting call's daily boards, one per date, built on the server
 * (src/lib/casting-call/generate.ts) by the daily cron job or by the first
 * player of a day that has none. Who is on a board is the puzzle, so these
 * stay on the server. They hold TMDB ids, so `synced_at` dates them for the 6-month limit.
 */
export const castingCallBoards = pgTable("casting_call_boards", {
  /** Opaque id, used in the board's API addresses. */
  id: text("id").primaryKey(),
  /** The day it is the daily board (YYYY-MM-DD). */
  date: date("date", { mode: "string" }).notNull().unique(),
  /** TMDB person ids in board order; a face's id is its position here. */
  personIds: jsonb("person_ids").$type<number[]>().notNull(),
  /** The best route, shown once the game is over: one lesser-known film per pair of faces. */
  pairs: jsonb("pairs").$type<BoardPair[]>().notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});
