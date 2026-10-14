"use client";

import Image from "next/image";
import type { CSSProperties, KeyboardEvent, Ref } from "react";

import type { PublicTile } from "@/lib/puzzle/types";
import { useLongPress } from "@/lib/use-long-press";
import { MarkerRing } from "./MarkerRing";
import { tileAltText } from "./tile-text";

export type TileEffect = { kind: "shake" | "settle"; color?: string };

interface TileProps {
  tile: PublicTile;
  label?: string;
  selected: boolean;
  effect?: TileEffect;
  focusable: boolean;
  buttonRef: Ref<HTMLButtonElement>;
  onToggle: () => void;
  onInspect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onFocus: () => void;
}

export function Tile({
  tile,
  label,
  selected,
  effect,
  focusable,
  buttonRef,
  onToggle,
  onInspect,
  onKeyDown,
  onFocus,
}: TileProps) {
  const longPress = useLongPress(onInspect);

  return (
    <li
      className="tile relative aspect-square list-none"
      data-tile-id={tile.id}
      data-effect={effect?.kind}
      style={effect?.color ? ({ "--settle-color": effect.color } as CSSProperties) : undefined}
    >
      <button
        ref={buttonRef}
        type="button"
        className="tile-face absolute inset-0 block touch-manipulation overflow-hidden rounded-[3px] bg-sheet-edge"
        aria-pressed={selected}
        tabIndex={focusable ? 0 : -1}
        onClick={() => {
          if (!longPress.consumeLongPress()) onToggle();
        }}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        {...longPress.handlers}
      >
        <Image
          src={tile.imageUrl}
          alt={tileAltText(tile)}
          fill
          unoptimized
          loading="eager"
          draggable={false}
          sizes="(max-width: 34rem) 25vw, 8rem"
          className={`object-cover transition-[filter] duration-150 ${selected ? "brightness-75" : ""}`}
        />
        {label && (
          <span className="tile-label absolute inset-x-0 bottom-0 z-[2] line-clamp-2 bg-[rgb(10_12_16/0.86)] px-1 pb-0.5 pt-[3px] text-left font-condensed text-[0.75rem] font-semibold leading-[1.1] text-white">
            <span className="sr-only">, label: </span>
            {label}
          </span>
        )}
      </button>
      {selected && <MarkerRing />}
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Inspect tile ${tile.number}`}
        onClick={onInspect}
        className="absolute right-0.5 top-0.5 z-[3] grid size-7 touch-manipulation place-items-center rounded-full text-white"
      >
        <span className="grid size-5 place-items-center rounded-full bg-[rgb(10_12_16/0.5)]">
          <svg viewBox="0 0 16 16" className="size-[11px]" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M9.75 9.75L14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
      </button>
    </li>
  );
}
