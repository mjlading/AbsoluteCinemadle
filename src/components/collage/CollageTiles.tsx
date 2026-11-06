"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";

import type { Crop } from "@/lib/puzzle/types";
import type { PublicCollageKeyword } from "@/lib/collage/types";

/** Alt text names the keyword and position only, never the film. */
export const collageAlt = (keyword: { label: string; tiles: unknown[] }, number: number) =>
  `${keyword.label}, close-up ${number} of ${keyword.tiles.length}`;

/**
 * One keyword's collage while the game is on: its close-ups in a 2x2 grid.
 * In enhance mode every tile becomes a button that widens itself.
 */
export function CollageGrid({
  keyword,
  enhancedTileId,
  enhancing,
  onEnhance,
}: {
  keyword: PublicCollageKeyword;
  enhancedTileId: string | null;
  enhancing: boolean;
  onEnhance: (tileId: string) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-1.5">
      {keyword.tiles.map((tile) => {
        const enhanced = tile.id === enhancedTileId;
        const picture = (
          <>
            <Image
              src={enhanced ? tile.enhancedUrl : tile.imageUrl}
              alt={`${collageAlt(keyword, tile.number)}${enhanced ? ", enhanced" : ""}`}
              fill
              unoptimized
              loading="eager"
              draggable={false}
              sizes="(max-width: 34rem) 45vw, 16rem"
              className="object-cover"
            />
            {enhanced && (
              <span className="absolute left-1.5 top-1.5 rounded-sm bg-[var(--tier-2)] px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-on-tape">
                Enhanced
              </span>
            )}
          </>
        );
        return (
          <li key={tile.id} className="relative aspect-square list-none overflow-hidden rounded-[3px] bg-sheet-edge">
            {enhancing ? (
              <button
                type="button"
                onClick={() => onEnhance(tile.id)}
                aria-label={`Enhance ${collageAlt(keyword, tile.number)}`}
                className="tile-face group absolute inset-0 cursor-zoom-out"
              >
                {picture}
                <span className="absolute inset-0 rounded-[3px] ring-[3px] ring-inset ring-[var(--tier-2)]/70 transition group-hover:ring-[var(--tier-2)] group-hover:bg-white/10" />
              </button>
            ) : (
              picture
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A tile that starts as its close-up and pulls back to the whole frame, the
 * end-of-game payoff. The frame is letterboxed in the square, and the starting
 * transform puts the crop exactly where the tile was.
 */
export function ZoomOutTile({
  frameUrl,
  crop,
  aspect,
  zoomed,
  delayMs,
  alt,
  onLoad,
}: {
  frameUrl: string;
  crop: Crop;
  aspect: number;
  zoomed: boolean;
  delayMs: number;
  alt: string;
  onLoad: () => void;
}) {
  // In units of the square: the frame is 1 wide and `a` tall, centred vertically.
  const a = Math.min(1, 1 / aspect);
  const offset = (1 - a) / 2;
  const scale = 1 / crop.width;
  const tx = -scale * crop.x * 100;
  const ty = ((-scale * crop.y * a - offset) / a) * 100;
  const style: CSSProperties = {
    top: `${offset * 100}%`,
    height: `${a * 100}%`,
    transformOrigin: "0 0",
    transform: zoomed ? "none" : `translate(${tx}%, ${ty}%) scale(${scale})`,
    transition: zoomed ? `transform 1700ms cubic-bezier(0.65, 0, 0.25, 1) ${delayMs}ms` : "none",
  };
  return (
    <div className="relative aspect-square overflow-hidden rounded-[3px] bg-black">
      {/* A plain img: the frame comes from our own image route, already sized on the server. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={frameUrl}
        alt={alt}
        onLoad={onLoad}
        draggable={false}
        className="absolute left-0 w-full max-w-none"
        style={style}
      />
    </div>
  );
}

/** True once every image has loaded, or after a timeout, so one slow frame can't hold the zoom back for ever. */
export function useAllLoaded(count: number, timeoutMs = 2500) {
  const [loaded, setLoaded] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), timeoutMs);
    return () => window.clearTimeout(timer);
  }, [timeoutMs]);
  return { ready: timedOut || loaded >= count, onLoad: () => setLoaded((n) => n + 1) };
}
