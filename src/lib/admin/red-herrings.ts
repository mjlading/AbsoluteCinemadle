import type { CastMember, CrewMember, MovieSummary, PersonFilmography } from "@/lib/tmdb/api";

/*
 * Helps the curator plant deliberate red herrings: people who link the
 * chosen films to each other, and other well-known films they made.
 */

export interface FilmCredits {
  tmdbId: number;
  title: string;
  cast: CastMember[];
  directors: CrewMember[];
}

export interface SharedPerson {
  personId: number;
  name: string;
  profilePath: string | null;
  credits: { tmdbId: number; title: string; role: string }[];
}

/** People who worked on more than one of the chosen films, as cast (top billed) or director. */
export function sharedPeople(films: FilmCredits[], castDepth = 20): SharedPerson[] {
  const people = new Map<number, SharedPerson>();
  const add = (personId: number, name: string, profilePath: string | null, film: FilmCredits, role: string) => {
    const person = people.get(personId) ?? { personId, name, profilePath, credits: [] };
    person.profilePath ??= profilePath;
    if (!person.credits.some((c) => c.tmdbId === film.tmdbId && c.role === role)) {
      person.credits.push({ tmdbId: film.tmdbId, title: film.title, role });
    }
    people.set(personId, person);
  };
  for (const film of films) {
    for (const member of film.cast.slice(0, castDepth)) {
      add(member.personId, member.name, member.profilePath, film, member.character ? `as ${member.character}` : "cast");
    }
    for (const director of film.directors) add(director.personId, director.name, null, film, "director");
  }
  return [...people.values()]
    .filter((p) => new Set(p.credits.map((c) => c.tmdbId)).size > 1)
    .sort((a, b) => b.credits.length - a.credits.length || a.name.localeCompare(b.name));
}

/** A person's best-known films (by TMDB vote count), skipping the ones already in the puzzle. */
export function bestKnownOtherFilms(
  filmography: PersonFilmography,
  excludeIds: ReadonlySet<number>,
  limit = 3,
): MovieSummary[] {
  const byId = new Map<number, MovieSummary>();
  for (const film of [...filmography.directed, ...filmography.acted]) {
    if (!excludeIds.has(film.tmdbId)) byId.set(film.tmdbId, film);
  }
  return [...byId.values()].sort((a, b) => b.voteCount - a.voteCount).slice(0, limit);
}
