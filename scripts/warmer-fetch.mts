/**
 * Fetches Warmer' film pool from TMDB: the best-known films by vote count, each with its
 * genres, keywords and TMDB recommendations, into .data/warmer/films.json (gitignored, TMDB data:
 * refetch before it is 6 months old). Then run `npm run warmer:pool`.
 *
 *   npm run warmer:fetch -- [films=1500] [out dir=.data/warmer]
 */
import { mkdir, writeFile } from "node:fs/promises";

const COUNT = Number(process.argv[2] ?? 1500);
const OUT = process.argv[3] ?? ".data/warmer";
const token = process.env.TMDB_READ_ACCESS_TOKEN;
if (!token) throw new Error("TMDB_READ_ACCESS_TOKEN is not set.");
const API = "https://api.themoviedb.org/3";

async function get<T>(path: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) return (await res.json()) as T;
    if (attempt >= 4 || (res.status !== 429 && res.status < 500)) throw new Error(`${path}: ${res.status}`);
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
}

type Discover = { results: { id: number }[] };
type Details = {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  vote_count: number;
  overview: string;
  genres: { id: number; name: string }[];
  keywords: { keywords: { id: number; name: string }[] };
  recommendations: { results: { id: number }[] };
};

const ids: number[] = [];
for (let page = 1; ids.length < COUNT; page++) {
  const { results } = await get<Discover>(`/discover/movie?sort_by=vote_count.desc&page=${page}`);
  if (results.length === 0) break;
  ids.push(...results.map((r) => r.id));
}

const films: object[] = [];
let next = 0;
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (next < Math.min(COUNT, ids.length)) {
      const id = ids[next++];
      let d: Details;
      try {
        d = await get<Details>(`/movie/${id}?append_to_response=keywords,recommendations`);
      } catch (error) {
        console.warn(`Skipped ${id}: ${(error as Error).message}`);
        continue;
      }
      films.push({
        id: d.id,
        title: d.title,
        year: d.release_date ? Number(d.release_date.slice(0, 4)) : null,
        posterPath: d.poster_path,
        votes: d.vote_count,
        overview: d.overview,
        genres: d.genres.map((g) => g.name),
        keywords: d.keywords.keywords.map((k) => k.name),
        recommendations: d.recommendations.results.map((r) => r.id),
      });
      if (films.length % 1000 === 0) console.log(`${films.length} films`);
    }
  }),
);

await mkdir(OUT, { recursive: true });
await writeFile(`${OUT}/films.json`, JSON.stringify({ fetchedAt: new Date().toISOString(), films }));
console.log(`Wrote ${films.length} films.`);
