"use client";

import { useEffect, useRef, useState } from "react";

import type { SoundHint } from "@/lib/puzzle/types";

/* Minimal typings for the YouTube IFrame Player API, loaded on demand. */
interface YouTubePlayer {
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}
interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      host?: string;
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: () => void;
      };
    },
  ) => YouTubePlayer;
}
declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** YT.PlayerState values. */
const ENDED = 0;
const PLAYING = 1;
const PAUSED = 2;
const BUFFERING = 3;

/** How long a press of our play button may go without the video starting before we suggest tapping the video. */
const START_GRACE_MS = 3000;

let apiPromise: Promise<YouTubeApi> | null = null;

const focusOnMount = (node: HTMLElement | null) => node?.focus();

/** Loads YouTube's IFrame API script once per page. */
function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise<YouTubeApi>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("YouTube could not be reached."));
    };
    document.head.append(script);
  });
  return apiPromise;
}

type Status = "loading" | "ready" | "starting" | "playing" | "played" | "failed";

/**
 * A short window of a YouTube video in a visible embedded player, as YouTube's
 * terms require (at least 200 by 200 pixels, nothing drawn over it). Our play
 * button starts the window by script, which the terms allow while the player is
 * fully visible; some mobile browsers only let a tap on the video itself start
 * it, so the player's own play button works too. `onReady` fires once the
 * player is ready, which is when a newly taken hint counts.
 */
export function YouTubeClip({
  hint,
  takeFocus = false,
  onReady,
}: {
  hint: SoundHint;
  /** Focus the clip as it appears, then its play button once the player is ready. */
  takeFocus?: boolean;
  onReady?: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [blocked, setBlocked] = useState(false);
  // The latest callback, without restarting the player when the parent re-renders.
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let player: YouTubePlayer | null = null;
    let cancelled = false;
    loadYouTubeApi().then(
      (YT) => {
        if (cancelled || !mountRef.current) return;
        player = new YT.Player(mountRef.current, {
          host: "https://www.youtube-nocookie.com",
          videoId: hint.youtubeId,
          width: "100%",
          height: "100%",
          playerVars: {
            start: Math.floor(hint.start),
            end: Math.ceil(hint.end),
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3,
            // YouTube's advice for pages that script the player: only take messages from this origin.
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              playerRef.current = player;
              setStatus("ready");
              onReadyRef.current?.();
            },
            onStateChange: ({ data }) => {
              if (cancelled) return;
              if (data === PLAYING || data === BUFFERING) {
                setStatus("playing");
                setBlocked(false);
              } else if (data === ENDED || data === PAUSED) {
                setStatus("played");
              }
            },
            onError: () => !cancelled && setStatus("failed"),
          },
        });
      },
      () => !cancelled && setStatus("failed"),
    );
    return () => {
      cancelled = true;
      playerRef.current = null;
      player?.destroy();
    };
  }, [hint.youtubeId, hint.start, hint.end]);

  useEffect(() => {
    if (status !== "starting") return;
    const timer = setTimeout(() => setBlocked(true), START_GRACE_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const busy = status === "playing" || (status === "starting" && !blocked);

  const play = () => {
    const player = playerRef.current;
    if (!player || busy) return;
    // Seeking back first makes a replay stop at the window's end again.
    player.seekTo(Math.floor(hint.start), true);
    player.playVideo();
    setStatus("starting");
  };

  return (
    <div ref={takeFocus ? focusOnMount : undefined} tabIndex={-1} className="flex flex-col items-center outline-none">
      <div aria-hidden="true" className="projector-beam" data-playing={status === "playing" || undefined} />
      <div className="relative aspect-video min-h-[200px] w-full min-w-[200px] overflow-hidden rounded-[4px] bg-black">
        <div ref={mountRef} className="absolute inset-0" />
      </div>
      {status !== "loading" && status !== "failed" && (
        <button
          ref={takeFocus ? focusOnMount : undefined}
          type="button"
          onClick={play}
          // Not disabled while playing, which would drop the keyboard focus.
          aria-disabled={busy}
          className="mt-4 min-h-12 w-full rounded-full bg-lamp px-6 text-lg font-semibold text-sheet not-aria-disabled:hover:bg-white aria-disabled:opacity-60"
        >
          {busy ? "Playing…" : status === "played" ? "Play it again" : "Play the clip"}
        </button>
      )}
      <p role="status" className="mt-3 min-h-5 text-center text-sm text-white/75">
        {status === "loading" && "Threading the projector…"}
        {status === "failed" &&
          (onReady
            ? "The clip couldn't be loaded, so this hint hasn't been counted. Try again later."
            : "The clip couldn't be loaded. Try again later.")}
        {status !== "loading" &&
          status !== "failed" &&
          (blocked ? "Nothing playing? Tap the video itself." : "About two seconds of sound.")}
      </p>
    </div>
  );
}
