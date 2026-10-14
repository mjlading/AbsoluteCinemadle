"use client";

import { useId, useState } from "react";

import { CloseButton, Dialog } from "@/components/ui/Dialog";
import { POINTS } from "@/config/scoring";
import { requestHint } from "@/lib/game/api";
import type { HintKind, IssuedHint, IssuedReviewHint, IssuedSoundHint } from "@/lib/puzzle/types";
import { YouTubeClip } from "./YouTubeClip";

/** Moves focus to a newly shown hint, so keyboard and screen reader users land on it. */
const focusOnMount = (node: HTMLElement | null) => node?.focus();

const COPY: Record<HintKind, { title: string; explain: string; cost: number }> = {
  sound: {
    title: "Sound hint",
    explain:
      "About two seconds from a trailer or clip of one film you haven't found yet. YouTube shows the video and its title, which often names the film, so this is a strong hint.",
    cost: Math.abs(POINTS.grid.perSoundHint),
  },
  review: {
    title: "Review hint",
    explain: "A line from a viewer's review of one film you haven't found yet, with names blanked out.",
    cost: Math.abs(POINTS.grid.perReviewHint),
  },
};

/**
 * Offers a hint and its cost, fetches it, and shows the hints of that kind the
 * player already has, so a hint they paid for can be looked at again for free.
 * `onIssued` fires when a hint counts: a review as it arrives, a sound clip
 * once its player is ready.
 */
export function HintDialog({
  kind,
  apiBase,
  solved,
  soundHints,
  reviewHints,
  left,
  onIssued,
  onClose,
}: {
  kind: HintKind | null;
  apiBase: string;
  solved: number[];
  soundHints: IssuedSoundHint[];
  reviewHints: IssuedReviewHint[];
  left: number;
  onIssued: (issued: IssuedHint) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  /** A clip that has arrived but doesn't count until its player is ready. */
  const [fresh, setFresh] = useState<IssuedSoundHint | null>(null);
  const [clipToken, setClipToken] = useState<number | null>(null);
  /** The hint just taken, which takes focus as it appears. */
  const [justTaken, setJustTaken] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = kind ? COPY[kind] : null;
  const taken = kind === "sound" ? soundHints : reviewHints;
  const clip = fresh ?? soundHints.find((h) => h.token === clipToken) ?? soundHints.at(-1) ?? null;

  const close = () => {
    setFresh(null);
    setClipToken(null);
    setJustTaken(null);
    setError(null);
    onClose();
  };

  async function take() {
    if (!kind || pending) return;
    setPending(true);
    setError(null);
    try {
      const seen = taken.map((h) => h.token);
      const none = `There's no new ${kind} hint for the films you have left.`;
      if (kind === "sound") {
        const { hint } = await requestHint(apiBase, "sound", solved, seen);
        if (hint) {
          setFresh(hint);
          setJustTaken(hint.token);
        } else setError(none);
      } else {
        const { hint } = await requestHint(apiBase, "review", solved, seen);
        if (hint) {
          onIssued({ kind: "review", hint });
          setJustTaken(hint.token);
        } else setError(none);
      }
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setPending(false);
    }
  }

  const countFresh = (hint: IssuedSoundHint) => {
    onIssued({ kind: "sound", hint });
    setClipToken(hint.token);
    setFresh(null);
  };

  return (
    <Dialog open={kind !== null} onClose={close} labelledBy={titleId} className="max-w-md bg-sheet text-white">
      {kind && copy && (
        <>
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="font-display text-3xl font-[850] leading-none">
              {copy.title}
            </h2>
            <CloseButton onClick={close} />
          </div>

          {kind === "review" &&
            reviewHints.map((hint) => (
              <figure
                key={hint.token}
                ref={hint.token === justTaken ? focusOnMount : undefined}
                tabIndex={-1}
                className="mt-5 outline-none"
              >
                <blockquote className="text-xl leading-snug">&ldquo;{hint.excerpt}&rdquo;</blockquote>
                <figcaption className="mt-3 text-sm text-white/65">From a review by {hint.author} on TMDB</figcaption>
              </figure>
            ))}

          {kind === "sound" && clip && (
            <div className="mt-4">
              {!fresh && soundHints.length > 1 && (
                <div role="group" aria-label="Your clips" className="mb-3 flex justify-center gap-2">
                  {soundHints.map((hint, index) => (
                    <button
                      key={hint.token}
                      type="button"
                      aria-pressed={hint === clip}
                      onClick={() => {
                        setClipToken(hint.token);
                        setJustTaken(null);
                      }}
                      className="min-h-9 rounded-full border-[1.5px] border-white/40 px-4 text-sm font-semibold hover:border-white aria-pressed:border-lamp aria-pressed:bg-lamp aria-pressed:text-sheet"
                    >
                      Clip {index + 1}
                    </button>
                  ))}
                </div>
              )}
              <YouTubeClip
                key={clip.token}
                hint={clip}
                takeFocus={clip.token === justTaken}
                onReady={clip === fresh ? () => countFresh(clip) : undefined}
              />
            </div>
          )}

          {!fresh && (
            <div className={taken.length > 0 ? "mt-5 border-t border-white/15 pt-4" : "mt-3"}>
              {taken.length === 0 && <p className="mb-2 text-white/85">{copy.explain}</p>}
              {left > 0 ? (
                <>
                  <p className="text-sm text-white/65">
                    Costs {copy.cost} points. {left} left today.
                  </p>
                  {error && (
                    <p role="alert" className="mt-3 text-sm text-white">
                      {error}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={take}
                    // Not disabled while fetching, which would drop the keyboard focus.
                    aria-disabled={pending}
                    className="mt-5 min-h-12 w-full rounded-full bg-lamp px-6 text-lg font-semibold text-sheet not-aria-disabled:hover:bg-white aria-disabled:opacity-40"
                  >
                    {pending
                      ? "Fetching…"
                      : `${taken.length > 0 ? "Use another hint" : "Use a hint"} (costs ${copy.cost} points)`}
                  </button>
                </>
              ) : (
                <p className="text-sm text-white/65">That&apos;s all the {kind} hints for today.</p>
              )}
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}
