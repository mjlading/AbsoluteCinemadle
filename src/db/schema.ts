import { sql } from "drizzle-orm";
import {
  customType,
  check,
  real,
  date,
  foreignKey,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import type { CollageKeyword, CollagePuzzle } from "@/lib/collage/types";
import type { SoundbytesBoard, StoredSoundNode } from "@/lib/soundbytes/types";
import { TILE_TYPES, type TileImage } from "@/lib/puzzle/types";

export const tileType = pgEnum("tile_type", TILE_TYPES);

/** Film metadata copied from TMDB. TMDB allows keeping it for at most 6 months, so `synced_at` drives refreshes. */
export const films = pgTable("films", {
  tmdbId: integer("tmdb_id").primaryKey(),
  title: text("title").notNull(),
  /** The title in the film's original language; also accepted as a warm-up answer. */
  originalTitle: text("original_title"),
  year: integer("year"),
  posterPath: text("poster_path"),
  /** The film's barcode: one dominant colour (hex) per TMDB backdrop, sorted by hue. */
  palette: jsonb("palette").$type<string[]>(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const puzzles = pgTable("puzzles", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Null while the puzzle is an unscheduled draft. */
  date: date("date", { mode: "string" }).unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const puzzleFilms = pgTable(
  "puzzle_films",
  {
    puzzleId: uuid("puzzle_id")
      .notNull()
      .references(() => puzzles.id, { onDelete: "cascade" }),
    filmId: integer("film_id")
      .notNull()
      .references(() => films.tmdbId),
    tier: smallint("tier").notNull(),
    /** Opaque id for this film's barcode in the bonus round; must not be derivable from the film. */
    barcodeId: uuid("barcode_id").notNull().defaultRandom(),
  },
  (t) => [
    primaryKey({ columns: [t.puzzleId, t.filmId] }),
    // DEFERRABLE INITIALLY DEFERRED (added by hand in drizzle/0000_init.sql) so two films can swap tiers in one statement.
    unique("puzzle_films_tier_unique").on(t.puzzleId, t.tier),
    check("puzzle_films_tier_range", sql`${t.tier} between 1 and 4`),
  ],
);

/** Tiles are immutable: changing a tile's picture replaces it, so its image URL can be cached forever. */
export const tiles = pgTable(
  "tiles",
  {
    id: text("id").primaryKey(),
    puzzleId: uuid("puzzle_id").notNull(),
    filmId: integer("film_id").notNull(),
    type: tileType("type").notNull(),
    image: jsonb("image").$type<TileImage>().notNull(),
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // A tile always belongs to a film of its own puzzle, and goes when that film is removed.
    foreignKey({
      columns: [t.puzzleId, t.filmId],
      foreignColumns: [puzzleFilms.puzzleId, puzzleFilms.filmId],
      name: "tiles_puzzle_film_fk",
    }).onDelete("cascade"),
  ],
);

/** The warm-up round: films shown under a foreign release title and its literal English back-translation. */
export const warmupEntries = pgTable(
  "warmup_entries",
  {
    /** Opaque id, sent to players. */
    id: text("id").primaryKey(),
    puzzleId: uuid("puzzle_id")
      .notNull()
      .references(() => puzzles.id, { onDelete: "cascade" }),
    /** 1 to 5, the order the cards are played in. */
    position: smallint("position").notNull(),
    filmId: integer("film_id")
      .notNull()
      .references(() => films.tmdbId),
    foreignTitle: text("foreign_title").notNull(),
    /** ISO 639-1 language code of the foreign title. */
    language: text("language").notNull(),
    /** ISO 3166-1 country code where the title was used, when known. */
    country: text("country"),
    literalTranslation: text("literal_translation").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("warmup_entries_position_unique").on(t.puzzleId, t.position),
    unique("warmup_entries_film_unique").on(t.puzzleId, t.filmId),
    check("warmup_entries_position_range", sql`${t.position} between 1 and 5`),
  ],
);

/**
 * Every LLM call, priced in millionths of a US dollar. A call first reserves
 * its worst-case cost, then settles to the real cost, so the spend cap holds
 * even for calls that are in flight at the same time.
 */
export const llmUsage = pgTable("llm_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  purpose: text("purpose").notNull(),
  model: text("model").notNull(),
  status: text("status", { enum: ["reserved", "settled", "failed"] }).notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costMicroUsd: integer("cost_micro_usd").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/** A barcode image the admin uploaded for one film of one puzzle, replacing the generated palette strip. */
export const barcodeUploads = pgTable(
  "barcode_uploads",
  {
    puzzleId: uuid("puzzle_id").notNull(),
    filmId: integer("film_id").notNull(),
    contentType: text("content_type").notNull(),
    data: bytea("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.puzzleId, t.filmId] }),
    foreignKey({
      columns: [t.puzzleId, t.filmId],
      foreignColumns: [puzzleFilms.puzzleId, puzzleFilms.filmId],
      name: "barcode_uploads_puzzle_film_fk",
    }).onDelete("cascade"),
  ],
);

/**
 * Keyword collage puzzles, curated in the collage lab and loaded with `npm run db:import-collage`.
 * A puzzle's keywords and tiles are one JSON document, validated on the way in and out
 * (src/lib/collage/puzzle-schema.ts). The answer and TMDB paths never leave the server.
 * They are TMDB data, so `synced_at` dates them for the 6-month limit like `films`.
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
 * The answer is TMDB data, so `synced_at` dates it for the 6-month limit like `films`.
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

/** A short clip from an official trailer or scene on YouTube, played as a sound hint. Never downloaded or rehosted. */
export const soundHints = pgTable(
  "sound_hints",
  {
    puzzleId: uuid("puzzle_id").notNull(),
    filmId: integer("film_id").notNull(),
    youtubeId: text("youtube_id").notNull(),
    startSeconds: real("start_seconds").notNull(),
    endSeconds: real("end_seconds").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.puzzleId, t.filmId] }),
    foreignKey({
      columns: [t.puzzleId, t.filmId],
      foreignColumns: [puzzleFilms.puzzleId, puzzleFilms.filmId],
      name: "sound_hints_puzzle_film_fk",
    }).onDelete("cascade"),
    check("sound_hints_window", sql`${t.endSeconds} > ${t.startSeconds} and ${t.startSeconds} >= 0`),
  ],
);

/** A trimmed excerpt of a TMDB user review, with names blanked, played as a text hint. */
export const reviewHints = pgTable(
  "review_hints",
  {
    puzzleId: uuid("puzzle_id").notNull(),
    filmId: integer("film_id").notNull(),
    excerpt: text("excerpt").notNull(),
    /** The reviewer's TMDB name, shown with the excerpt. */
    author: text("author").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.puzzleId, t.filmId] }),
    foreignKey({
      columns: [t.puzzleId, t.filmId],
      foreignColumns: [puzzleFilms.puzzleId, puzzleFilms.filmId],
      name: "review_hints_puzzle_film_fk",
    }).onDelete("cascade"),
  ],
);
