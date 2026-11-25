/**
 * Loads Warmer's film pool (.data/warmer/pool.json, from `npm run warmer:pool`) into the
 * database, replacing the stored pool but keeping its secret, so past and coming days keep
 * their hidden films. The first import makes the secret.
 *
 *   npm run db:import-warmer
 */
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../src/db/schema";
import type { Pool } from "../src/lib/warmer/pool";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
const { fetchedAt, films, vectors } = JSON.parse(await readFile(".data/warmer/pool.json", "utf8")) as Pool & {
  fetchedAt: string;
};

const client = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(client, { schema });
const [stored] = await db
  .select({ secret: schema.warmerPool.secret })
  .from(schema.warmerPool)
  .where(eq(schema.warmerPool.id, "current"));
const row = { films, vectors, syncedAt: new Date(fetchedAt) };
await db
  .insert(schema.warmerPool)
  .values({ id: "current", secret: stored?.secret ?? randomBytes(24).toString("base64url"), ...row })
  .onConflictDoUpdate({ target: schema.warmerPool.id, set: row });
await client.end();
console.log(`Imported Warmer's pool of ${films.length} films${stored ? "" : " with a new secret"}.`);
