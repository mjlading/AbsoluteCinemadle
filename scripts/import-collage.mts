/**
 * Loads Close-Ups puzzles exported by the collage lab (tools/collage-lab/export_demo.py)
 * into the database. Each puzzle replaces any stored one with the same id or the
 * same date; every other stored puzzle is left alone.
 *
 *   npm run db:import-collage -- .data/keyword-collage.json
 *   npm run db:import-collage -- e2e/fixtures/keyword-collage.json --days=0,-1
 *
 * `--days` dates the puzzles in file order relative to today on this machine (0 is
 * today, -1 yesterday), for tests; without it each puzzle keeps the date in the file.
 * The file holds answers and TMDB paths: keep it out of git, and delete it once imported.
 */
import { readFile } from "node:fs/promises";

import { inArray, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../src/db/schema";
import { addDays, localIsoDate } from "../src/lib/dates";
import { CollageExportSchema } from "../src/lib/collage/puzzle-schema";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
const file = process.argv[2];
if (!file) throw new Error("Usage: npm run db:import-collage -- <exported file>.json [--days=0,-1]");
const offsets = process.argv
  .find((arg) => arg.startsWith("--days="))
  ?.slice("--days=".length)
  .split(",")
  .map(Number);

const { puzzles } = CollageExportSchema.parse(JSON.parse(await readFile(file, "utf8")));
if (offsets && offsets.length !== puzzles.length) {
  throw new Error(`--days has ${offsets.length} offsets for ${puzzles.length} puzzles.`);
}
const rows = puzzles.map((p, position) => ({
  id: p.id,
  name: p.name,
  position,
  date: offsets ? addDays(localIsoDate(), offsets[position]) : p.date,
  answer: p.answer,
  keywords: p.keywords,
}));

const client = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(client, { schema });
const table = schema.collagePuzzles;
await db.transaction(async (tx) => {
  const dates = rows.flatMap((r) => (r.date ? [r.date] : []));
  await tx.delete(table).where(
    or(
      inArray(
        table.id,
        rows.map((r) => r.id),
      ),
      dates.length > 0 ? inArray(table.date, dates) : undefined,
    ),
  );
  if (rows.length > 0) await tx.insert(table).values(rows);
});
await client.end();
for (const r of rows) console.log(`${r.date ?? "undated"}  ${r.name}`);
console.log(`Imported ${rows.length} Close-Ups puzzle${rows.length === 1 ? "" : "s"}.`);
