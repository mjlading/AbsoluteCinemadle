"use client";

import { removeFilm, setTier } from "@/app/admin/actions";
import { TIERS, type Tier } from "@/lib/puzzle/types";
import { ConfirmButton } from "./ConfirmButton";
import { useAdminAction } from "./use-admin-action";

/** Moves a film to another tier (swapping with whatever is there) or removes it. */
export function FilmControls({
  puzzleId,
  filmId,
  title,
  tier,
}: {
  puzzleId: string;
  filmId: number;
  title: string;
  tier: Tier;
}) {
  const { pending, error, run } = useAdminAction();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <label className="flex items-center gap-2">
          <span aria-hidden="true">Tier</span>
          <select
            value={tier}
            aria-label={`Tier for ${title}`}
            disabled={pending}
            onChange={(event) => run(() => setTier(puzzleId, filmId, Number(event.target.value)))}
            className="min-h-9 rounded-md border border-ink/30 bg-surface px-2"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <ConfirmButton
          disabled={pending}
          onConfirm={() => run(() => removeFilm(puzzleId, filmId))}
          confirmLabel="Click again to remove"
          className="min-h-9 underline-offset-2 hover:underline"
        >
          Remove film
        </ConfirmButton>
      </div>
      {error && (
        <p role="alert" className="text-sm text-marker">
          {error}
        </p>
      )}
    </div>
  );
}
