"use client";

import { addFilm } from "@/app/admin/actions";
import type { Tier } from "@/lib/puzzle/types";
import { FilmPicker } from "./FilmPicker";
import { useAdminAction } from "./use-admin-action";

/** Searches TMDB and adds the chosen film to an empty tier. */
export function FilmSearch({ puzzleId, tier }: { puzzleId: string; tier: Tier }) {
  const { pending, error, run } = useAdminAction();
  return (
    <div className="flex flex-col gap-2">
      <FilmPicker disabled={pending} onPick={(film) => run(() => addFilm(puzzleId, film.tmdbId, tier))} />
      {error && (
        <p role="alert" className="text-sm text-marker">
          {error}
        </p>
      )}
    </div>
  );
}
