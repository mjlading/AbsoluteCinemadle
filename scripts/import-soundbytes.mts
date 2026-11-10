/**
 * Loads Soundbytes boards exported by the soundbytes lab (tools/soundbytes-lab/export.py)
 * into the database. Each board replaces any stored one with the same id or the same
 * date (its clips go with it); every other stored board is left alone. Each line's clip
 * is read from `clips/<id>.mp3` (or `.wav`) next to the board file; a theme is only an
 * address on Apple's servers.
 *
 *   npm run db:import-soundbytes -- .data/soundbytes/boards.json --from=2026-11-12
 *   npm run db:import-soundbytes -- e2e/fixtures/soundbytes/boards.json --days=0,-1
 *
 * `--from` dates the boards one a day in file order, starting on that date; `--days`
 * dates them relative to today on this machine (0 is today, -1 yesterday), for tests.
 * Without either each board keeps the date in the file, and an undated board is never
 * shown to players.
 * The files hold answers and clips: keep them out of git.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { inArray, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../src/db/schema";
import { addDays, isIsoDate, localIsoDate } from "../src/lib/dates";
import { SoundbytesExportSchema } from "../src/lib/soundbytes/board-schema";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
const file = process.argv[2];
if (!file) {
  throw new Error("Usage: npm run db:import-soundbytes -- <exported file>.json [--from=YYYY-MM-DD | --days=0,-1]");
}
const option = (name: string) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const from = option("from");
const daysOption = option("days");
if (from && daysOption) throw new Error("Pass --from or --days, not both.");
if (from && !isIsoDate(from)) throw new Error("--from takes a date: YYYY-MM-DD.");

const { boards } = SoundbytesExportSchema.parse(JSON.parse(await readFile(file, "utf8")));
const offsets = from ? boards.map((_, i) => i) : daysOption?.split(",").map(Number);
if (offsets && offsets.length !== boards.length) {
  throw new Error(`--days has ${offsets.length} offsets for ${boards.length} boards.`);
}
const EXTENSION = { "audio/mpeg": "mp3", "audio/wav": "wav" } as const;

const rows = boards.map((b, position) => ({
  id: b.id,
  name: b.name,
  position,
  date: offsets ? addDays(from ?? localIsoDate(), offsets[position]) : b.date,
  answer: b.answer,
  nodes: b.nodes,
}));
const clips: (typeof schema.soundbytesClips.$inferInsert)[] = [];
for (const board of boards) {
  for (const { clip } of board.nodes) {
    if ("url" in clip) continue; // a theme plays from Apple's servers, never copied here
    const data = await readFile(join(dirname(file), "clips", `${clip.id}.${EXTENSION[clip.contentType]}`));
    clips.push({ id: clip.id, boardId: board.id, contentType: clip.contentType, data });
  }
}

const client = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(client, { schema });
const table = schema.soundbytesBoards;
await db.transaction(async (tx) => {
  const dates = rows.flatMap((r) => (r.date ? [r.date] : []));
  // Clips go with their boards.
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
  for (const clip of clips) await tx.insert(schema.soundbytesClips).values(clip);
});
await client.end();
for (const r of rows) console.log(`${r.date ?? "undated"}  ${r.name}`);
const kb = Math.round(clips.reduce((sum, c) => sum + c.data.byteLength, 0) / 1024);
console.log(
  `Imported ${boards.length} Soundbytes board${boards.length === 1 ? "" : "s"} with ${clips.length} clips (${kb} KB).`,
);
