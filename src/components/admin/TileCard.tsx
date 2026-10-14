"use client";

import Image from "next/image";
import { useId, useState } from "react";

import { deleteTile, updateTileLabel } from "@/app/admin/actions";
import { TILE_TYPE_NAMES } from "@/components/grid/tile-text";
import type { TileType } from "@/lib/puzzle/types";
import { ConfirmButton } from "./ConfirmButton";
import { useAdminAction } from "./use-admin-action";

export interface EditorTile {
  id: string;
  type: TileType;
  label: string;
  imageUrl: string;
}

/** A placed tile: its rendered picture, an editable label and a remove button. */
export function TileCard({ puzzleId, tile }: { puzzleId: string; tile: EditorTile }) {
  const labelId = useId();
  const [draft, setDraft] = useState(tile.label);
  const { pending, error, run } = useAdminAction();

  const save = () => {
    const next = draft.trim();
    if (!next) setDraft(tile.label);
    else if (next !== tile.label) run(() => updateTileLabel(puzzleId, tile.id, next));
  };

  return (
    <li className="flex flex-col gap-1.5">
      <div className="relative aspect-square overflow-hidden rounded-[3px] bg-sheet">
        <Image src={tile.imageUrl} alt="" fill unoptimized loading="eager" sizes="10rem" className="object-cover" />
      </div>
      <span className="text-xs text-ink-soft first-letter:uppercase">{TILE_TYPE_NAMES[tile.type]}</span>
      <label htmlFor={labelId} className="sr-only">
        Label
      </label>
      <input
        id={labelId}
        value={draft}
        disabled={pending}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") setDraft(tile.label);
        }}
        className="min-h-9 rounded-md border border-ink/20 bg-surface px-2 text-sm focus:border-ink"
      />
      <ConfirmButton
        disabled={pending}
        onConfirm={() => run(() => deleteTile(puzzleId, tile.id))}
        confirmLabel="Click again to remove"
        className="self-start text-sm underline-offset-2 hover:underline"
      >
        Remove
      </ConfirmButton>
      {error && (
        <p role="alert" className="text-sm text-marker">
          {error}
        </p>
      )}
    </li>
  );
}
