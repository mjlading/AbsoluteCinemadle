"use client";

import { useId, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

import { addTile } from "@/app/admin/actions";
import { TILE_TYPE_NAMES } from "@/components/grid/tile-text";
import { CloseButton, Dialog } from "@/components/ui/Dialog";
import type { Crop, TileType } from "@/lib/puzzle/types";
import type { ImageInfo } from "@/lib/tmdb/api";
import { defaultSquareCrop, tmdbImageUrl } from "@/lib/tmdb/images";
import { useAdminAction } from "./use-admin-action";

const DEFAULT_LABELS: Record<Exclude<TileType, "headshot">, string> = {
  still: "Still",
  empty_set: "Location",
  prop: "Prop",
};

export interface CropTarget {
  source: "profile" | "backdrop";
  image: ImageInfo;
  /** For headshots: the actor's name, which becomes the label. */
  personName?: string;
}

/**
 * Frames a square tile from a TMDB image. Only the crop rectangle is stored;
 * the server renders it, so players never receive the full picture.
 */
export function CropDialog({
  puzzleId,
  filmId,
  target,
  onClose,
}: {
  puzzleId: string;
  filmId: number;
  target: CropTarget;
  onClose: () => void;
}) {
  const titleId = useId();
  const labelId = useId();
  const { source, image, personName } = target;
  const types: TileType[] = source === "profile" ? ["headshot"] : ["still", "empty_set", "prop"];
  const initial = defaultSquareCrop(image.width, image.height, source);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [crop, setCrop] = useState<Crop>(initial);
  const [type, setType] = useState<TileType>(types[0]);
  const [label, setLabel] = useState(personName ?? DEFAULT_LABELS.still);
  const [labelEdited, setLabelEdited] = useState(false);
  const { pending, error, run } = useAdminAction();

  const chooseType = (next: TileType) => {
    setType(next);
    if (!labelEdited && next !== "headshot") setLabel(DEFAULT_LABELS[next]);
  };

  return (
    <Dialog open onClose={onClose} labelledBy={titleId} className="max-w-3xl bg-surface text-ink">
      <div className="flex items-start justify-between gap-4">
        <h2 id={titleId} className="text-lg font-semibold">
          Frame the tile
        </h2>
        <CloseButton onClick={onClose} />
      </div>
      <p className="text-sm text-ink-soft">
        Drag to move and use the slider to zoom. Tight crops make good prop tiles.
      </p>

      <div className="relative mt-3 h-[min(55vh,26rem)] overflow-hidden rounded-lg bg-sheet">
        <Cropper
          image={tmdbImageUrl(image.path, source === "profile" ? "h632" : "w1280")}
          crop={position}
          zoom={zoom}
          maxZoom={8}
          aspect={1}
          objectFit="contain"
          initialCroppedAreaPercentages={{
            x: initial.x * 100,
            y: initial.y * 100,
            width: initial.width * 100,
            height: initial.height * 100,
          }}
          onCropChange={setPosition}
          onZoomChange={setZoom}
          onCropComplete={(area: Area) =>
            setCrop({ x: area.x / 100, y: area.y / 100, width: area.width / 100, height: area.height / 100 })
          }
        />
      </div>

      <label className="mt-3 flex items-center gap-3 text-sm">
        Zoom
        <input
          type="range"
          min={1}
          max={8}
          step={0.05}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="flex-1 accent-ink"
        />
      </label>

      {types.length > 1 && (
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold">Tile type</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {types.map((t) => (
              <label
                key={t}
                className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm first-letter:uppercase ${
                  type === t ? "border-ink bg-ink text-table" : "border-ink/30"
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={type === t}
                  onChange={() => chooseType(t)}
                  className="sr-only"
                />
                {TILE_TYPE_NAMES[t]}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="mt-4 flex flex-col gap-1">
        <label htmlFor={labelId} className="text-sm font-semibold">
          Label <span className="font-normal text-ink-soft">(shown when a player flips the tile)</span>
        </label>
        <input
          id={labelId}
          value={label}
          onChange={(event) => {
            setLabel(event.target.value);
            setLabelEdited(true);
          }}
          className="min-h-10 rounded-lg border-[1.5px] border-ink/30 bg-surface px-3 focus:border-ink"
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-marker">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-full border-[1.5px] border-ink px-5 font-semibold"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={pending || !label.trim()}
          onClick={() =>
            run(
              () =>
                addTile(puzzleId, {
                  filmId,
                  type,
                  label: label.trim(),
                  image: { kind: "tmdb", source, path: image.path, crop },
                }),
              onClose,
            )
          }
          className="min-h-11 rounded-full bg-ink px-6 font-semibold text-table disabled:opacity-40"
        >
          {pending ? "Adding…" : "Add tile"}
        </button>
      </div>
    </Dialog>
  );
}
