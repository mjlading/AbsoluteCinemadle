"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { REST, nextMouth, voiceAt, type Mouth } from "@/lib/soundbytes/mouth";
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
 * Every frame it writes CSS custom properties on the element passed to
 * `progressTarget`, without re-rendering: `--sb-progress` (0 to 1), `--sb-open`
 * (how far the mouth is open: 0, 0.5 or 1), `--sb-side` (-1 or 1: the head
 * swings to the other side on every new syllable), `--sb-sway` (0 to 1: how
 * far it swings, the voice's loudness eased) and `--sb-time` (seconds into the
 * clip). They follow the voice alone, from the clip's mouth track, so the
 * soundtrack under a line doesn't move the mouth.
 */
export function useClipPlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const frame = useRef(0);
  const target = useRef<HTMLElement | null>(null);
  const [playing, setPlaying] = useState<Playing | null>(null);

  const write = useCallback((progress: number, mouth: Mouth) => {
    const style = target.current?.style;
    if (!style) return;
    style.setProperty("--sb-progress", progress.toFixed(4));
    style.setProperty("--sb-open", String(mouth.open));
    style.setProperty("--sb-side", String(mouth.side));
    style.setProperty("--sb-sway", mouth.sway.toFixed(3));
    style.setProperty("--sb-time", mouth.t.toFixed(3));
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    audio.current?.pause();
    write(0, REST);
    setPlaying(null);
  }, [write]);

  const toggle = useCallback(
    (nodeId: string, clip: Clip) => {
      if (playing?.nodeId === nodeId && playing.clip.url === clip.url) {
        stop();
        return;
      }
      cancelAnimationFrame(frame.current);
      const element = (audio.current ??= new Audio());
      element.pause();
      // A theme is a window of a longer preview: a media fragment starts it there, and the tick below ends it.
      const start = clip.start ?? 0;
      const end = start + clip.seconds;
      element.src = clip.start === undefined ? clip.url : `${clip.url}#t=${start},${end}`;
      element.currentTime = start;
      write(0, REST);
      element.onended = stop;
      // The window's end, checked on the element's own time updates, which keep coming in a background tab
      // where animation frames stop (the fragment pauses the audio there, with no "ended" event).
      element.ontimeupdate = clip.start === undefined ? null : () => element.currentTime >= end - 0.05 && stop();
      element.play().catch(() => stop());
      setPlaying({ nodeId, clip });

      let mouth = REST;
      const tick = () => {
        const t = element.currentTime - start;
        const length =
          clip.start === undefined && Number.isFinite(element.duration) && element.duration > 0
            ? element.duration
            : clip.seconds;
        mouth = nextMouth(mouth, element.paused ? 0 : voiceAt(clip, t), t);
        write(Math.min(1, Math.max(0, t) / length), mouth);
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    },
    [playing, stop, write],
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
