import type { MovieDetails } from "@/lib/tmdb/api";
import type { NamesToBlank } from "./blank-names";

const CAST_DEPTH = 15;

/** The names a review excerpt for this film must not contain. */
export function namesForFilm(movie: MovieDetails): NamesToBlank {
  const cast = movie.cast.slice(0, CAST_DEPTH);
  return {
    titles: [movie.title, movie.originalTitle].filter((t): t is string => Boolean(t)),
    actors: cast.map((c) => c.name),
    // TMDB joins alternative character names with " / ".
    characters: cast.flatMap((c) => c.character.split(" / ")).filter(Boolean),
    directors: movie.directors.map((d) => d.name),
  };
}
