/**
 * Loads Close-Ups puzzles exported by the collage lab
 * (tools/collage-lab/export_demo.py) into the database, replacing all of them.
 *
 *   npm run db:import-collage -- .data/keyword-collage.json
 *
 * The file holds answers and TMDB paths: keep it out of git, and delete it once imported.
 */
import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../src/db/schema";
import { CollageExportSchema } from "../src/lib/collage/puzzle-schema";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
const file = process.argv[2];
if (!file) throw new Error("Usage: npm run db:import-collage -- <exported file>.json");

const { puzzles } = CollageExportSchema.parse(JSON.parse(await readFile(file, "utf8")));

const client = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(client, { schema });
await db.transaction(async (tx) => {
  await tx.delete(schema.collagePuzzles);
  if (puzzles.length > 0) {
    await tx
      .insert(schema.collagePuzzles)
      .values(
        puzzles.map((p, position) => ({ id: p.id, name: p.name, position, answer: p.answer, keywords: p.keywords })),
      );
  }
});
await client.end();
console.log(`Imported ${puzzles.length} Close-Ups puzzle${puzzles.length === 1 ? "" : "s"}.`);
