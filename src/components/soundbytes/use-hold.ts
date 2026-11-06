"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";

const MOVE_TOLERANCE_PX = 10;
/** A press this long is clearly a hold, so a refused one shakes instead of being taken for a tap. */
const REFUSE_AFTER_MS = 220;

/** What holding would do now: spend, shake because the player can't afford it, or nothing at all. */
export type HoldVerdict = "spend" | "refuse" | "none";

interface HoldOptions {
  ms: number;
  verdict: () => HoldVerdict;
  onTap: () => void;
  onComplete: () => void;
  onRefuse: () => void;
}

/**
 * Tap plays, hold spends: one press, two outcomes. While a spending hold is
 * under way `holding` is true, so the caller can run the hold animation;
 * letting go early cancels it at no cost. Works with touch, mouse and keyboard
 * (Enter or Space: a quick press taps, holding the key holds).
 */
export function useHold({ ms, verdict, onTap, onComplete, onRefuse }: HoldOptions) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  // Set when a press ended as a hold or refusal, so the click that follows it is not also a tap.
  const consumed = useRef(false);
  const keyDown = useRef(false);
  const latest = useRef({ verdict, onTap, onComplete, onRefuse });
  useEffect(() => {
    latest.current = { verdict, onTap, onComplete, onRefuse };
  });

  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const cancel = () => {
    clear();
    setHolding(false);
  };
  useEffect(() => clear, []);

  const begin = () => {
    clear();
    consumed.current = false;
    const kind = latest.current.verdict();
    if (kind === "none") return;
    if (kind === "refuse") {
      timer.current = window.setTimeout(() => {
        timer.current = null;
        consumed.current = true;
        latest.current.onRefuse();
      }, REFUSE_AFTER_MS);
      return;
    }
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      consumed.current = true;
      setHolding(false);
      latest.current.onComplete();
    }, ms);
  };

  return {
    holding,
    handlers: {
      onPointerDown(event: PointerEvent) {
        if (event.button !== 0) return;
        origin.current = { x: event.clientX, y: event.clientY };
        begin();
      },
      onPointerMove(event: PointerEvent) {
        const start = origin.current;
        if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > MOVE_TOLERANCE_PX) cancel();
      },
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onPointerLeave: cancel,
      onClick() {
        if (consumed.current) {
          consumed.current = false;
          return;
        }
        latest.current.onTap();
      },
      onKeyDown(event: KeyboardEvent) {
        if (event.key !== "Enter" && event.key !== " ") return;
        // The press is handled here, so the browser's own click on Enter or Space must not happen too.
        event.preventDefault();
        if (event.repeat || keyDown.current) return;
        keyDown.current = true;
        origin.current = null;
        begin();
      },
      onKeyUp(event: KeyboardEvent) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (!keyDown.current) return;
        keyDown.current = false;
        const wasTap = !consumed.current;
        cancel();
        consumed.current = false;
        if (wasTap) latest.current.onTap();
      },
      onBlur() {
        keyDown.current = false;
        cancel();
      },
      onContextMenu(event: MouseEvent) {
        // Stops the long-press menu on touch devices.
        event.preventDefault();
      },
    },
  };
}
