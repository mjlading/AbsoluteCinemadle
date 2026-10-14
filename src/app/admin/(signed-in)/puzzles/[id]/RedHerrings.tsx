import Image from "next/image";

import { bestKnownOtherFilms, sharedPeople, type FilmCredits } from "@/lib/admin/red-herrings";
import { getPersonFilmography } from "@/lib/tmdb/cached";
import { tmdbImageUrl } from "@/lib/tmdb/images";

const LEAD_CAST = 3;

/** People linking the chosen films, and their other well-known films, for planting misleading tiles. */
export async function RedHerrings({ films }: { films: FilmCredits[] }) {
  const shared = sharedPeople(films);
  const inPuzzle = new Set(films.map((f) => f.tmdbId));

  const leads = await Promise.all(
    films.map(async (film) => {
      const people = [
        ...film.directors.map((d) => ({ personId: d.personId, name: d.name, role: "director" })),
        ...film.cast
          .slice(0, LEAD_CAST)
          .map((c) => ({ personId: c.personId, name: c.name, role: c.character ? `as ${c.character}` : "cast" })),
      ];
      const rows = await Promise.all(
        people.map(async (person) => {
          try {
            return { ...person, others: bestKnownOtherFilms(await getPersonFilmography(person.personId), inPuzzle) };
          } catch {
            return { ...person, others: [] };
          }
        }),
      );
      return { film, rows };
    }),
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="font-semibold">People in more than one of these films</h3>
        {shared.length === 0 ? (
          <p className="mt-1 text-ink-soft">
            {films.length < 2 ? "Add at least two films to compare them." : "No shared actors or directors."}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {shared.map((person) => (
              <li key={person.personId} className="flex items-center gap-3">
                <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-[2px] bg-ink/10">
                  {person.profilePath && (
                    <Image
                      src={tmdbImageUrl(person.profilePath, "w92")}
                      alt=""
                      fill
                      unoptimized
                      sizes="2.5rem"
                      className="object-cover"
                    />
                  )}
                </span>
                <span>
                  <span className="font-semibold">{person.name}</span>
                  <span className="block text-sm text-ink-soft">
                    {person.credits.map((c) => `${c.title} (${c.role})`).join("; ")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {leads.map(({ film, rows }) => (
        <div key={film.tmdbId}>
          <h3 className="font-semibold">Elsewhere from the people behind {film.title}</h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {rows.map((row) => (
              <li key={`${row.personId}-${row.role}`}>
                <span className="font-semibold">{row.name}</span> <span className="text-ink-soft">({row.role})</span>:{" "}
                {row.others.length > 0
                  ? row.others.map((o) => `${o.title}${o.year ? ` (${o.year})` : ""}`).join(", ")
                  : "nothing else well known"}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
