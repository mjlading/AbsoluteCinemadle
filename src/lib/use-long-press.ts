"use client";

import { useRef, type MouseEvent, type PointerEvent } from "react";

const MOVE_TOLERANCE_PX = 10;

/**
 * Press-and-hold detection for touch and mouse.
 * The click that ends a long press still fires, so the caller checks
 * `consumeLongPress()` in its click handler and skips the normal action.
 */
export function useLongPress(onLongPress: () => void, delayMs = 450) {
  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  return {
    handlers: {
      onPointerDown(event: PointerEvent) {
        if (event.button !== 0) return;
        cancel();
        fired.current = false;
        origin.current = { x: event.clientX, y: event.clientY };
        timer.current = window.setTimeout(() => {
          timer.current = null;
          fired.current = true;
          onLongPress();
        }, delayMs);
      },
      onPointerMove(event: PointerEvent) {
        const start = origin.current;
        if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > MOVE_TOLERANCE_PX) cancel();
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu(event: MouseEvent) {
        // Stops the browser's own long-press menu on touch devices.
        event.preventDefault();
      },
    },
    consumeLongPress(): boolean {
      const wasLongPress = fired.current;
      fired.current = false;
      return wasLongPress;
    },
  };
}
