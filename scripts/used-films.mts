/**
 * Adds every film in the database's Close-Ups puzzles and Soundbytes boards to the
 * used-films ledger (.data/used-films.json), which the labs' pickers skip.
 * Run it against production before picking a new batch:
 *
 *   DATABASE_URL=<production url> npm run db:used-films
 *
 * It prints only counts, never which films.
 */
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../src/db/schema";
import { recordUsedFilms } from "./used-films-ledger";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");

const client = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(client, { schema });
const ids = (table: typeof schema.collagePuzzles | typeof schema.soundbytesBoards) =>
  db
    .select({
      // Soundbytes boards and older Close-Ups puzzles are films.
      mediaType: sql<"movie" | "tv">`coalesce(${table.answer}->>'mediaType', 'movie')`,
      tmdbId: sql<number>`(${table.answer}->>'tmdbId')::int`,
    })
    .from(table);
const closeUps = await ids(schema.collagePuzzles);
const soundbytes = await ids(schema.soundbytesBoards);
await client.end();

await recordUsedFilms("close-ups", closeUps);
await recordUsedFilms("soundbytes", soundbytes);
console.log(`Recorded ${closeUps.length} Close-Ups and ${soundbytes.length} Soundbytes films as used.`);
