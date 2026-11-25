/*
 * Warmer's film pool and similarity. Each film is a sparse TF-IDF vector over
 * what TMDB says about it: keywords (what it is about), genres, decade, and its
 * recommendations (what the same audience watches). Two films are alike when
 * their vectors point the same way; shared genres and nearby years add a little,
 * so even films with nothing else in common still rank in a sensible order.
 */

export interface PoolFilm {
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  votes: number;
  overview: string;
  genres: string[];
  keywords: string[];
  recommendations: number[];
}

export interface Pool {
  films: Omit<PoolFilm, "keywords" | "recommendations">[];
  /** Sparse unit vectors by film index, sorted by feature index: [feature, weight]. */
  vectors: [number, number][][];
}

/** How much each kind of feature counts, on top of its rarity. */
const WEIGHTS = { keyword: 1, genre: 0.6, decade: 0.4, rec: 0.9 };
/** The fallback's share: shared genres, then closeness in years. */
const FALLBACK = { genres: 0.06, years: 0.04 };

export function buildPool(fetched: PoolFilm[]): Pool {
  // TMDB's paged lists can shift while they are read, repeating a film.
  const films = [...new Map(fetched.map((f) => [f.id, f])).values()];
  const inPool = new Set(films.map((f) => f.id));
  const raw = films.map((f) => {
    const features = new Map<string, number>();
    for (const k of f.keywords) features.set(`k:${k}`, WEIGHTS.keyword);
    for (const g of f.genres) features.set(`g:${g}`, WEIGHTS.genre);
    if (f.year) features.set(`d:${Math.floor(f.year / 10)}`, WEIGHTS.decade);
    // A film and the films it recommends share a feature, and so do films recommended together.
    features.set(`r:${f.id}`, WEIGHTS.rec);
    for (const r of f.recommendations) if (inPool.has(r)) features.set(`r:${r}`, WEIGHTS.rec);
    return features;
  });

  const df = new Map<string, number>();
  for (const features of raw) for (const key of features.keys()) df.set(key, (df.get(key) ?? 0) + 1);
  const index = new Map<string, number>();
  const vectors = raw.map((features) => {
    const entries: [number, number][] = [];
    for (const [key, weight] of features) {
      const n = df.get(key)!;
      if (n < 2) continue; // shared with nobody: says nothing about closeness
      if (!index.has(key)) index.set(key, index.size);
      entries.push([index.get(key)!, weight * Math.log(films.length / n)]);
    }
    const norm = Math.hypot(...entries.map(([, w]) => w)) || 1;
    return entries.map(([i, w]) => [i, w / norm] as [number, number]).sort((a, b) => a[0] - b[0]);
  });

  return {
    films: films.map(({ id, title, year, posterPath, votes, overview, genres }) => ({
      id,
      title,
      year,
      posterPath,
      votes,
      overview,
      genres,
    })),
    vectors,
  };
}

/** Dot product of two sorted sparse unit vectors. */
export function cosine(a: [number, number][], b: [number, number][]): number {
  let sum = 0;
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i][0] === b[j][0]) sum += a[i++][1] * b[j++][1];
    else if (a[i][0] < b[j][0]) i++;
    else j++;
  }
  return sum;
}

/** How alike film `i` is to film `t`. */
export function similarity(pool: Pool, t: number, i: number): number {
  const a = pool.films[t];
  const b = pool.films[i];
  const shared = a.genres.filter((g) => b.genres.includes(g)).length;
  const genres = shared / (new Set([...a.genres, ...b.genres]).size || 1);
  const years = a.year && b.year ? Math.exp(-Math.abs(a.year - b.year) / 15) : 0;
  return cosine(pool.vectors[t], pool.vectors[i]) + FALLBACK.genres * genres + FALLBACK.years * years;
}

/** Every film's index, most like `target` first (the target itself is first). */
export function ranking(pool: Pool, target: number): number[] {
  const scores = pool.films.map((_, i) => (i === target ? Infinity : similarity(pool, target, i)));
  return scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
}
