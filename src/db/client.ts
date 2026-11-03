import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
  // `prepare: false` keeps this compatible with transaction-mode poolers, like Neon's pooled DATABASE_URL.
  const client = postgres(url, { prepare: false, max: 5 });
  return drizzle(client, { schema });
}

type Db = ReturnType<typeof createDb>;

// One pool per server process, surviving hot reloads in development.
const globalForDb = globalThis as unknown as { cinemadleDb?: Db };

export function db(): Db {
  globalForDb.cinemadleDb ??= createDb();
  return globalForDb.cinemadleDb;
}
