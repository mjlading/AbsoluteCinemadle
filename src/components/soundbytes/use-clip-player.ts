"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Clip } from "@/lib/soundbytes/types";

export interface Playing {
  nodeId: string;
  clip: Clip;
}

type Graph = { context: AudioContext; analyser: AnalyserNode; samples: Float32Array<ArrayBuffer> };

/** Safari 17+ lets a page say it plays media, so Web Audio is not muted by the silent switch. */
type WithAudioSession = Navigator & { audioSession?: { type: string } };

/** A made-up speech rhythm for browsers without Web Audio: syllables in bursts, with pauses. */
function rhythm(t: number): number {
  if (t % 3.4 > 2.6) return 0;
  return (0.3 + 0.7 * Math.abs(Math.sin(t * Math.PI * 3.1)) ** 0.7) * (0.75 + 0.25 * Math.sin(t * 1.7));
}

/**
 * Plays one clip at a time through a single audio element. iOS Safari only
 * lets audio start from a user gesture, so `toggle` must be called straight
 * from a tap or key handler, never after an await or a timer.
 *
 * Every frame it writes CSS custom properties on the element passed to
 * `progressTarget`, without re-rendering: `--sb-progress` (0 to 1), `--sb-level`
 * (the clip's loudness, 0 to 1, measured through Web Audio) and `--sb-time`
 * (seconds into the clip), which the talking characters move to.
 */
export function useClipPlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const graph = useRef<Graph | null | "unavailable">(null);
  const level = useRef(0);
  const frame = useRef(0);
  const target = useRef<HTMLElement | null>(null);
  const [playing, setPlaying] = useState<Playing | null>(null);

  const write = useCallback((progress: number, loudness: number, time: number) => {
    const style = target.current?.style;
    if (!style) return;
    style.setProperty("--sb-progress", progress.toFixed(4));
    style.setProperty("--sb-level", loudness.toFixed(3));
    style.setProperty("--sb-time", time.toFixed(3));
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    audio.current?.pause();
    level.current = 0;
    write(0, 0, 0);
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
      if (graph.current === null) graph.current = connect(element);
      const g = graph.current === "unavailable" ? null : graph.current;
      void g?.context.resume();
      element.pause();
      element.src = clip.url;
      element.currentTime = 0;
      write(0, 0, 0);
      element.onended = stop;
      element.play().catch(() => stop());
      setPlaying({ nodeId, clip });

      const tick = () => {
        const length = Number.isFinite(element.duration) && element.duration > 0 ? element.duration : clip.seconds;
        let goal: number;
        if (g) {
          g.analyser.getFloatTimeDomainData(g.samples);
          let sum = 0;
          for (const v of g.samples) sum += v * v;
          goal = Math.min(1, Math.sqrt(sum / g.samples.length) * 3.2);
        } else {
          goal = element.paused ? 0 : rhythm(element.currentTime);
        }
        // Rise fast, fall slower, so motion follows syllables and beats without flicker.
        level.current += (goal - level.current) * (goal > level.current ? 0.5 : 0.12);
        write(Math.min(1, element.currentTime / length), level.current, element.currentTime);
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
      if (graph.current && graph.current !== "unavailable") void graph.current.context.close();
    },
    [],
  );

  const progressTarget = useCallback((element: HTMLElement | null) => {
    target.current = element;
  }, []);

  return { playing, toggle, stop, progressTarget };
}

/**
 * Routes the audio element through an analyser, so the characters can follow
 * the clip's loudness. Called inside the first tap, so iOS lets the context
 * start; a media element can only be routed once. Without Web Audio the clip
 * still plays and the characters follow a made-up rhythm instead.
 */
function connect(element: HTMLAudioElement): Graph | "unavailable" {
  try {
    const session = (navigator as WithAudioSession).audioSession;
    if (session) session.type = "playback";
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.55;
    context.createMediaElementSource(element).connect(analyser);
    analyser.connect(context.destination);
    return { context, analyser, samples: new Float32Array(analyser.fftSize) };
  } catch {
    return "unavailable";
  }
}
