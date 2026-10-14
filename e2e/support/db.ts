import postgres from "postgres";

import { E2E_DATABASE_URL } from "./env";

/** Direct access to the E2E database, for arranging state the UI would take many steps to build. */
export const sql = postgres(E2E_DATABASE_URL, { max: 2, onnotice: () => {} });

export interface FilmSeed {
  tmdbId: number;
  title: string;
  tier: number;
}

const randomId = () => Math.random().toString(36).slice(2, 14).padEnd(12, "x");

/**
 * Creates an unscheduled puzzle with the given films and, per film, that many
 * placeholder tiles, plus warm-up cards for the given films. Returns the puzzle id.
 */
export async function createDraft(films: FilmSeed[], tilesPerFilm: number[], warmup: FilmSeed[] = []): Promise<string> {
  const [{ id }] = await sql<{ id: string }[]>`insert into puzzles default values returning id`;
  for (const [index, film] of films.entries()) {
    await sql`insert into films (tmdb_id, title) values (${film.tmdbId}, ${film.title}) on conflict (tmdb_id) do nothing`;
    await sql`insert into puzzle_films (puzzle_id, film_id, tier) values (${id}, ${film.tmdbId}, ${film.tier})`;
    for (let n = 0; n < tilesPerFilm[index]; n++) {
      const image = { kind: "placeholder", glyph: "🎬", hue: (index * 90 + n * 20) % 360 };
      await sql`
        insert into tiles (id, puzzle_id, film_id, type, image, label)
        values (${randomId()}, ${id}, ${film.tmdbId}, ${n % 2 === 0 ? "still" : "prop"}, ${sql.json(image)}, ${`Clue ${n + 1}`})`;
    }
  }
  for (const [index, film] of warmup.entries()) {
    await sql`insert into films (tmdb_id, title) values (${film.tmdbId}, ${film.title}) on conflict (tmdb_id) do nothing`;
    await sql`
      insert into warmup_entries (id, puzzle_id, position, film_id, foreign_title, language, country, literal_translation)
      values (${randomId()}, ${id}, ${index + 1}, ${film.tmdbId}, ${`Titre ${index + 1}`}, 'fr', 'FR', ${`Title ${index + 1}`})`;
  }
  return id;
}
