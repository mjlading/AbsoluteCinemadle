"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Clip } from "@/lib/soundbytes/types";

export interface Playing {
  nodeId: string;
  clip: Clip;
}

/**
 * Plays one clip at a time through a single audio element. iOS Safari only
 * lets audio start from a user gesture, so `toggle` must be called straight
 * from a tap or key handler, never after an await or a timer.
 *
 * Progress is written to the CSS custom property `--sb-progress` (0 to 1) on
 * the element passed to `progressTarget`, every frame, without re-rendering.
 */
export function useClipPlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const frame = useRef(0);
  const target = useRef<HTMLElement | null>(null);
  const [playing, setPlaying] = useState<Playing | null>(null);

  const setProgress = (value: number) => target.current?.style.setProperty("--sb-progress", value.toFixed(4));

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    audio.current?.pause();
    setProgress(0);
    setPlaying(null);
  }, []);

  const toggle = useCallback(
    (nodeId: string, clip: Clip) => {
      if (playing?.nodeId === nodeId && playing.clip.url === clip.url) {
        stop();
        return;
      }
      cancelAnimationFrame(frame.current);
      const element = (audio.current ??= new Audio());
      element.pause();
      element.src = clip.url;
      element.currentTime = 0;
      setProgress(0);
      element.onended = stop;
      element.play().catch(() => stop());
      setPlaying({ nodeId, clip });

      const tick = () => {
        const length = Number.isFinite(element.duration) && element.duration > 0 ? element.duration : clip.seconds;
        setProgress(Math.min(1, element.currentTime / length));
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    },
    [playing, stop],
  );

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      audio.current?.pause();
    },
    [],
  );

  const progressTarget = useCallback((element: HTMLElement | null) => {
    target.current = element;
  }, []);

  return { playing, toggle, stop, progressTarget };
}
