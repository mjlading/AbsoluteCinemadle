// Counts TMDB backdrops for a sample of films and series. Usage: node count-backdrops.mjs
import { readFileSync, writeFileSync } from "node:fs";

const envFile = new URL("../../.env.local", import.meta.url);
const token = readFileSync(envFile, "utf8")
  .match(/^TMDB_READ_ACCESS_TOKEN=(.+)$/m)?.[1]
  ?.trim();
if (!token) throw new Error("No TMDB_READ_ACCESS_TOKEN");

const api = async (path, params = {}) => {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

const movies = [
  ["Casablanca", 1942],
  ["The Wizard of Oz", 1939],
  ["Jaws", 1975],
  ["Star Wars", 1977],
  ["The Shining", 1980],
  ["Back to the Future", 1985],
  ["Pulp Fiction", 1994],
  ["Toy Story", 1995],
  ["The Matrix", 1999],
  ["Spirited Away", 2001],
  ["The Grand Budapest Hotel", 2014],
  ["Whiplash", 2014],
  ["Mad Max: Fury Road", 2015],
  ["Moonlight", 2016],
  ["Parasite", 2019],
  ["Everything Everywhere All at Once", 2022],
  ["Aftersun", 2022],
  ["Past Lives", 2023],
  ["Oppenheimer", 2023],
  ["Barbie", 2023],
  ["Anatomy of a Fall", 2023],
  ["Dune: Part Two", 2024],
  ["Sinners", 2025],
  ["One Battle After Another", 2025],
];
const shows = [
  ["Breaking Bad", 2008],
  ["Succession", 2018],
  ["Severance", 2022],
  ["The Bear", 2022],
];

const summarize = (imgs) => ({
  total: imgs.length,
  textless: imgs.filter((i) => i.iso_639_1 === null).length,
  hd: imgs.filter((i) => i.width >= 1920).length,
});

const rows = [];
for (const [title, year] of movies) {
  const { results } = await api("/search/movie", { query: title, year });
  const m = results[0];
  const { backdrops } = await api(`/movie/${m.id}/images`);
  rows.push({ kind: "movie", title: m.title, year, id: m.id, ...summarize(backdrops) });
}
for (const [title, year] of shows) {
  const { results } = await api("/search/tv", { query: title, first_air_date_year: year });
  const s = results[0];
  const { backdrops } = await api(`/tv/${s.id}/images`);
  const details = await api(`/tv/${s.id}`);
  let stills = 0;
  for (const season of details.seasons.filter((x) => x.season_number > 0)) {
    const sd = await api(`/tv/${s.id}/season/${season.season_number}`);
    stills += sd.episodes.reduce((n, e) => n + (e.still_path ? 1 : 0), 0);
  }
  rows.push({ kind: "tv", title: s.name, year, id: s.id, ...summarize(backdrops), episodeStills: stills });
}
console.table(rows);
writeFileSync(new URL("./counts.json", import.meta.url), JSON.stringify(rows, null, 2));
