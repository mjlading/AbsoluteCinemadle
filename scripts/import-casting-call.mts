/**
 * Loads hand-made Casting call boards into the database: the E2E fixtures, or a
 * board the owner wants on a particular day. Daily boards are otherwise built
 * by the server itself (src/lib/casting-call/source.ts), so this is rarely needed.
 * Each board replaces any stored one with the same id or date.
 *
 *   npm run db:import-casting-call -- e2e/fixtures/casting-call.json --days=0,-1
 *   npm run db:import-casting-call -- my-boards.json --from=2026-12-24
 *
 * `--days` dates the boards in file order relative to today on this machine (0 is
 * today, -1 yesterday); `--from` dates them one a day from a date. One is required.
 */
import { readFile } from "node:fs/promises";

import { inArray, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

import { RULES } from "../src/config/rules";
import * as schema from "../src/db/schema";
import { addDays, isIsoDate, localIsoDate } from "../src/lib/dates";

const FACES = RULES.castingCall.faceCount;
const Face = z
  .number()
  .int()
  .min(0)
  .max(FACES - 1);
const FileSchema = z.object({
  boards: z.array(
    z.object({
      id: z.string().min(1),
      personIds: z.array(z.number().int().positive()).length(FACES),
      pairs: z.array(z.object({ filmId: z.number().int().positive(), faces: z.tuple([Face, Face]) })),
    }),
  ),
});

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
const file = process.argv[2];
const option = (name: string) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const from = option("from");
const days = option("days")?.split(",").map(Number);
if (!file || (!from && !days) || (from && days)) {
  throw new Error("Usage: npm run db:import-casting-call -- <file>.json (--days=0,-1 | --from=YYYY-MM-DD)");
}
if (from && !isIsoDate(from)) throw new Error("--from takes a date: YYYY-MM-DD.");

const { boards } = FileSchema.parse(JSON.parse(await readFile(file, "utf8")));
const offsets = days ?? boards.map((_, i) => i);
if (offsets.length !== boards.length)
  throw new Error(`--days has ${offsets.length} offsets for ${boards.length} boards.`);
const rows = boards.map((b, i) => ({ ...b, date: addDays(from ?? localIsoDate(), offsets[i]) }));

const client = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(client, { schema });
const table = schema.castingCallBoards;
await db.transaction(async (tx) => {
  await tx.delete(table).where(
    or(
      inArray(
        table.id,
        rows.map((r) => r.id),
      ),
      inArray(
        table.date,
        rows.map((r) => r.date),
      ),
    ),
  );
  await tx.insert(table).values(rows);
});
await client.end();
for (const r of rows) console.log(`${r.date}  ${r.id}`);
console.log(`Imported ${rows.length} Casting call board${rows.length === 1 ? "" : "s"}.`);
