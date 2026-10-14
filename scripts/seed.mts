/**
 * Schedules the emoji sample puzzle, for development and tests.
 *
 *   npm run db:seed                      today, if that day is free
 *   npm run db:seed -- --days=-1,0,1     yesterday, today and tomorrow
 *   npm run db:seed -- --reset           wipe all puzzles first (only on a *_test database)
 *
 * Film titles and posters come from TMDB when a token is configured.
 */
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../src/db/schema";
import { localIsoDate } from "../src/lib/dates";
import { newTileId } from "../src/lib/ids";
import { SAMPLE_FILMS, SAMPLE_WARMUP, SAMPLE_WARMUP_FILMS, sampleTiles } from "../src/lib/puzzle/sample-puzzle";
import { getMovie } from "../src/lib/tmdb/api";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");

const args = process.argv.slice(2);
const reset = args.includes("--reset");
const offsets = (args.find((a) => a.startsWith("--days="))?.slice("--days=".length) ?? "0").split(",").map(Number);

const client = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(client, { schema });

if (reset) {
  if (!new URL(url).pathname.endsWith("_test")) {
    throw new Error("--reset wipes every puzzle, so it only runs against a database whose name ends in _test.");
  }
  await db.execute(
    sql`truncate ${schema.warmupEntries}, ${schema.tiles}, ${schema.puzzleFilms}, ${schema.puzzles}, ${schema.films}`,
  );
  console.log("Removed all puzzles.");
}

for (const film of [...SAMPLE_FILMS, ...SAMPLE_WARMUP_FILMS]) {
  let details = {
    title: film.title,
    originalTitle: null as string | null,
    year: film.year,
    posterPath: null as string | null,
  };
  if (process.env.TMDB_READ_ACCESS_TOKEN) {
    try {
      const movie = await getMovie(film.tmdbId);
      details = {
        title: movie.title,
        originalTitle: movie.originalTitle,
        year: movie.year,
        posterPath: movie.posterPath,
      };
    } catch (error) {
      console.warn(`Using built-in details for ${film.title}: ${(error as Error).message}`);
    }
  }
  await db
    .insert(schema.films)
    .values({ tmdbId: film.tmdbId, ...details })
    .onConflictDoUpdate({ target: schema.films.tmdbId, set: { ...details, syncedAt: new Date() } });
}

/** Gives a puzzle the sample warm-up, unless it already has one. */
async function addSampleWarmup(tx: Pick<typeof db, "select" | "insert">, puzzleId: string) {
  const existing = await tx
    .select({ id: schema.warmupEntries.id })
    .from(schema.warmupEntries)
    .where(eq(schema.warmupEntries.puzzleId, puzzleId));
  if (existing.length > 0) return;
  await tx
    .insert(schema.warmupEntries)
    .values(SAMPLE_WARMUP.map((entry, i) => ({ ...entry, id: newTileId(), position: i + 1, puzzleId })));
}

for (const offset of offsets) {
  const date = localIsoDate(new Date(Date.now() + offset * 86_400_000));
  const [taken] = await db.select({ id: schema.puzzles.id }).from(schema.puzzles).where(eq(schema.puzzles.date, date));
  if (taken) {
    await addSampleWarmup(db, taken.id);
    console.log(`${date} already has a puzzle; kept it.`);
    continue;
  }
  await db.transaction(async (tx) => {
    const [puzzle] = await tx.insert(schema.puzzles).values({ date }).returning({ id: schema.puzzles.id });
    await tx
      .insert(schema.puzzleFilms)
      .values(SAMPLE_FILMS.map((f) => ({ puzzleId: puzzle.id, filmId: f.tmdbId, tier: f.tier })));
    await tx.insert(schema.tiles).values(sampleTiles(newTileId).map((t) => ({ ...t, puzzleId: puzzle.id })));
    await addSampleWarmup(tx, puzzle.id);
  });
  console.log(`Scheduled the sample puzzle for ${date}.`);
}

await client.end();
