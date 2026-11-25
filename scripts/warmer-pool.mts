/**
 * Builds Warmer's pool (.data/warmer/pool.json) from the fetched films: TF-IDF vectors
 * for similarity. Run after `npm run warmer:fetch`.
 *
 *   npm run warmer:pool -- [dir=.data/warmer]
 */
import { readFile, writeFile } from "node:fs/promises";

import { buildPool, ranking, type PoolFilm } from "../src/lib/warmer/pool";

const DIR = process.argv[2] ?? ".data/warmer";
const { films, fetchedAt } = JSON.parse(await readFile(`${DIR}/films.json`, "utf8")) as {
  films: PoolFilm[];
  fetchedAt: string;
};
const pool = buildPool(films);
await writeFile(`${DIR}/pool.json`, JSON.stringify({ fetchedAt, ...pool }));
console.log(`Pool of ${pool.films.length} films written.`);

// A taste of the rankings, to judge by eye.
for (const title of ["Titanic", "The Matrix", "Toy Story"]) {
  const t = pool.films.findIndex((f) => f.title === title);
  if (t < 0) continue;
  const order = ranking(pool, t);
  const rank = (name: string) => order.findIndex((i) => pool.films[i].title === name) + 1;
  console.log(
    `${title}: ${order
      .slice(1, 9)
      .map((i) => pool.films[i].title)
      .join(", ")}`,
  );
  console.log(
    `  ${["Inception", "Jaws", "Shrek", "The Godfather", "Finding Nemo"].map((n) => `${n} #${rank(n)}`).join(", ")}`,
  );
}
