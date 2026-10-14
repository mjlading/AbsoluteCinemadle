"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";

import { CloseButton, Dialog } from "@/components/ui/Dialog";
import { POINTS } from "@/config/scoring";
import type { PublicTile } from "@/lib/puzzle/types";
import { tileAltText } from "./tile-text";

interface InspectDialogProps {
  tile: PublicTile | null;
  /** Where the tile sits on screen, so the view can grow out of it like a slide lifted to a loupe. */
  originRect: DOMRect | null;
  label?: string;
  selected: boolean;
  /** False when four other tiles are already selected. */
  canSelect: boolean;
  revealing: boolean;
  error: string | null;
  onToggle: () => void;
  onReveal: () => void;
  onClose: () => void;
}

/** A tile shown large, with the paid label reveal and a select toggle. */
export function InspectDialog({
  tile,
  originRect,
  label,
  selected,
  canSelect,
  revealing,
  error,
  onToggle,
  onReveal,
  onClose,
}: InspectDialogProps) {
  const flipCost = Math.abs(POINTS.grid.perFlip);
  const imageRef = useRef<HTMLDivElement>(null);
  const tileId = tile?.id;

  useLayoutEffect(() => {
    const image = imageRef.current;
    const dialog = image?.closest("dialog");
    if (!tileId || !image || !dialog || !originRect) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    loupeZoom(dialog, image, originRect);
  }, [tileId, originRect]);

  return (
    <Dialog open={tile !== null} onClose={onClose} labelledBy="inspect-title" className="max-w-md bg-sheet text-white">
      {tile && (
        <>
          <div className="flex items-start justify-between gap-4">
            <h2 id="inspect-title" className="pt-1 font-condensed text-lg font-semibold">
              {tileAltText(tile)}
            </h2>
            <CloseButton onClick={onClose} />
          </div>

          <div ref={imageRef} className="relative mt-3 aspect-square overflow-hidden rounded-[4px] bg-sheet-edge">
            <Image
              src={`${tile.imageUrl}?size=large`}
              alt=""
              fill
              unoptimized
              draggable={false}
              sizes="(max-width: 28rem) 100vw, 28rem"
              className="object-cover"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {label ? (
              <p className="min-w-0 flex-1 text-lg font-semibold leading-snug">
                <span className="sr-only">Label: </span>
                {label}
              </p>
            ) : (
              <button
                type="button"
                onClick={onReveal}
                disabled={revealing}
                className="flex min-h-12 flex-1 flex-col items-center justify-center rounded-full border-[1.5px] border-white/80 px-4 py-1 leading-tight enabled:hover:bg-white/10 disabled:opacity-50"
              >
                <span className="font-semibold">Reveal label</span>
                <span className="text-sm text-white/75">costs {flipCost} points</span>
              </button>
            )}
            <button
              type="button"
              onClick={onToggle}
              disabled={!selected && !canSelect}
              aria-pressed={selected}
              className={`min-h-12 rounded-full px-6 font-semibold disabled:opacity-40 ${
                selected
                  ? "border-[1.5px] border-marker text-white enabled:hover:bg-marker/15"
                  : "bg-marker-strong text-white enabled:hover:brightness-110"
              }`}
            >
              {selected ? "Deselect" : "Select"}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-white">
              {error}
            </p>
          )}
          {!selected && !canSelect && <p className="mt-2 text-sm text-white/70">Four tiles are already selected.</p>}
        </>
      )}
    </Dialog>
  );
}

/** Grows the dialog out of the tile: the big image starts exactly over the tile and expands into place. */
function loupeZoom(dialog: HTMLElement, image: HTMLElement, origin: DOMRect) {
  const box = dialog.getBoundingClientRect();
  const target = image.getBoundingClientRect();
  if (target.width === 0) return;
  const scale = origin.width / target.width;
  dialog.animate(
    [
      {
        transformOrigin: `${target.left - box.left}px ${target.top - box.top}px`,
        transform: `translate(${origin.left - target.left}px, ${origin.top - target.top}px) scale(${scale})`,
        opacity: 0.4,
      },
      { transformOrigin: `${target.left - box.left}px ${target.top - box.top}px`, transform: "none", opacity: 1 },
    ],
    { duration: 300, easing: "cubic-bezier(0.2, 0.85, 0.25, 1)" },
  );
}
