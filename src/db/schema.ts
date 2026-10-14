import { sql } from "drizzle-orm";
import {
  check,
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
