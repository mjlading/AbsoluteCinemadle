"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { RULES } from "@/config/rules";
import { widenCrop } from "@/lib/collage/crop";
import type { PublicCollageKeyword } from "@/lib/collage/types";
import type { Crop } from "@/lib/puzzle/types";
import { PANEL_ID, tabId } from "./KeywordStrip";

/** Alt text names the keyword and position only, never the film. */
export const collageAlt = (keyword: { label: string; tiles: unknown[] }, number: number) =>
  `${keyword.label}, close-up ${number} of ${keyword.tiles.length}`;

export type FrameInfo = { frameUrl: string; crop: Crop; aspect: number };

/**
 * One keyword's collage: its close-ups in a square 2x2 grid. While picking a
 * close-up to enhance, every tile is a button; once the game is over (and the
 * frames are known) every tile pulls back to its full frame.
 * Mount it with a key per keyword, so `effect` plays as each collage comes in.
 */
export function CollageGrid({
  keyword,
  index,
  enhancedTileId,
  freshEnhance,
  picking,
  onPick,
  frames,
  effect,
  onLoaded,
}: {
  keyword: PublicCollageKeyword;
  /** The keyword's place in the strip, for the tab panel's label. */
  index: number;
  enhancedTileId: string | null;
  /** True right after the player enhanced, so the widening plays once. */
  freshEnhance: boolean;
  picking: boolean;
  onPick: (tileId: string) => void;
  frames: Map<string, FrameInfo> | null;
  effect: "swap" | "slip" | null;
  /** Called once all the close-ups have loaded. */
  onLoaded?: () => void;
}) {
  const loaded = useRef(0);
  const countLoad = () => {
    loaded.current += 1;
    if (loaded.current === keyword.tiles.length) onLoaded?.();
  };

  return (
    <div
      id={PANEL_ID}
      role="tabpanel"
      aria-labelledby={tabId(index)}
      tabIndex={-1}
      className={`grid grid-cols-2 gap-1 overflow-hidden rounded-[10px] ${
        effect === "slip" ? "closeups-slip" : effect === "swap" ? "closeups-swap" : ""
      }`}
    >
      {keyword.tiles.map((tile, i) => {
        const alt = collageAlt(keyword, tile.number);
        const frame = frames?.get(tile.id);
        if (frame) {
          // The enhanced close-up starts its zoom-out from the wider crop it was showing.
          const crop =
            tile.id === enhancedTileId
              ? widenCrop(frame.crop, { width: frame.aspect, height: 1 }, RULES.closeUps.enhanceFactor)
              : frame.crop;
          return (
            <div key={tile.id} className="relative aspect-square overflow-hidden bg-[#0a0b0d]">
              <ZoomOutTile
                cropUrl={tile.id === enhancedTileId ? tile.enhancedUrl : tile.imageUrl}
                frameUrl={frame.frameUrl}
                crop={crop}
                aspect={frame.aspect}
                delayMs={160 + i * 120}
                alt={`${alt}, full frame`}
              />
            </div>
          );
        }

        const enhanced = tile.id === enhancedTileId;
        const picture = (
          <>
            {/* Plain imgs: tiles come from our own image route, already cropped and sized on the server. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tile.imageUrl}
              alt={enhanced ? "" : alt}
              onLoad={countLoad}
              onError={countLoad}
              draggable={false}
              className="absolute inset-0 size-full object-cover"
            />
            {enhanced && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tile.enhancedUrl}
                alt={`${alt}, enhanced`}
                draggable={false}
                // Shown once loaded, so the crop stays up meanwhile and the widening starts from it.
                onLoad={(event) => {
                  event.currentTarget.style.opacity = "1";
                  if (freshEnhance) event.currentTarget.classList.add("closeups-enhanced");
                }}
                style={{ opacity: 0 }}
                className="absolute inset-0 size-full object-cover"
              />
            )}
          </>
        );
        return (
          <div key={tile.id} className="relative aspect-square overflow-hidden bg-[#0a0b0d]">
            {picking ? (
              <button
                type="button"
                onClick={() => onPick(tile.id)}
                className="tile-face group absolute inset-0 cursor-zoom-in focus-visible:outline-offset-[-3px]"
              >
                {picture}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-black/30 shadow-[inset_0_0_0_2px_rgb(255_255_255/0.25)] transition group-hover:bg-transparent group-hover:shadow-[inset_0_0_0_3px_#fff] group-focus-visible:bg-transparent"
                />
              </button>
            ) : (
              picture
            )}
          </div>
        );
      })}
    </div>
  );
}

export const ENHANCE_ID = "closeups-enhance";

/**
 * The round magnifier where the four close-ups meet: once per game, it widens one of them.
 * What it does is told to screen readers only; on screen the game explains itself.
 */
export function EnhanceBadge({ pressed, used, onPress }: { pressed: boolean; used: boolean; onPress: () => void }) {
  return (
    <>
      <span id={`${ENHANCE_ID}-hint`} className="sr-only">
        Widens one close-up, once per game.
      </span>
      <button
        id={ENHANCE_ID}
        type="button"
        aria-label="Enhance"
        aria-describedby={`${ENHANCE_ID}-hint`}
        aria-pressed={pressed}
        onClick={onPress}
        tabIndex={used ? -1 : undefined}
        data-gone={used || undefined}
        className={`closeups-badge absolute left-1/2 top-1/2 z-10 grid size-[46px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border backdrop-blur-md hover:scale-106 focus-visible:outline-white ${
          pressed
            ? "border-white bg-white text-sheet"
            : "border-white/30 bg-[rgb(16_18_22/0.55)] text-white hover:bg-[rgb(16_18_22/0.75)]"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-[22px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5 21 21M8 10.5h5M10.5 8v5" />
        </svg>
      </button>
    </>
  );
}

/**
 * A tile that starts as its close-up and pulls back to the whole frame, the
 * end-of-game payoff. The close-up stays up until the frame has loaded; then
 * the frame takes its place and zooms out, each tile on its own. The frame is
 * letterboxed in the square, and the starting transform puts the crop exactly
 * where the tile was.
 */
export function ZoomOutTile({
  cropUrl,
  frameUrl,
  crop,
  aspect,
  delayMs,
  alt,
}: {
  cropUrl: string;
  frameUrl: string;
  crop: Crop;
  aspect: number;
  delayMs: number;
  alt: string;
}) {
  const [phase, setPhase] = useState<"loading" | "loaded" | "zoomed">("loading");

  // Pull back two frames after the frame first painted at the close-up, so the transition has a start.
  useEffect(() => {
    if (phase !== "loaded") return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPhase("zoomed"));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [phase]);

  // In units of the square: the frame is 1 wide and `a` tall, centred vertically.
  const a = Math.min(1, 1 / aspect);
  const offset = (1 - a) / 2;
  const scale = 1 / crop.width;
  const tx = -scale * crop.x * 100;
  const ty = ((-scale * crop.y * a - offset) / a) * 100;
  const zoomed = phase === "zoomed";
  const style: CSSProperties = {
    top: `${offset * 100}%`,
    height: `${a * 100}%`,
    opacity: phase === "loading" ? 0 : 1,
    transformOrigin: "0 0",
    transform: zoomed ? "none" : `translate(${tx}%, ${ty}%) scale(${scale})`,
    transition: zoomed ? `transform 1700ms cubic-bezier(0.65, 0, 0.25, 1) ${delayMs}ms` : "none",
  };
  return (
    <>
      {phase === "loading" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cropUrl} alt="" draggable={false} className="absolute inset-0 size-full object-cover" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={frameUrl}
        alt={alt}
        onLoad={() => setPhase((p) => (p === "loading" ? "loaded" : p))}
        draggable={false}
        className="absolute left-0 w-full max-w-none"
        style={style}
      />
    </>
  );
}
