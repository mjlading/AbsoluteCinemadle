"use client";

import { useId, useRef, useState, useTransition } from "react";

import {
  removeReviewHint,
  removeSoundHint,
  saveReviewHint,
  saveSoundHint,
  suggestReviewHint,
} from "@/app/admin/actions";
import { blankNames, type NamesToBlank } from "@/lib/hints/blank-names";
import { formatSeconds, parseSeconds, parseYoutubeId } from "@/lib/hints/youtube";
import type { ReviewHint, SoundHint } from "@/lib/puzzle/types";
import type { Review, Video } from "@/lib/tmdb/api";
import { useAdminAction } from "./use-admin-action";

const inputClass = "min-h-10 rounded-lg border-[1.5px] border-ink/30 bg-surface px-3 focus:border-ink";

/** A film's two optional hints: a YouTube sound clip and a review excerpt. */
export function HintEditor({
  puzzleId,
  filmId,
  title,
  sound,
  review,
  names,
}: {
  puzzleId: string;
  filmId: number;
  title: string;
  sound: SoundHint | null;
  review: ReviewHint | null;
  names: NamesToBlank;
}) {
  return (
    <li className="flex flex-col gap-5 rounded-lg border border-ink/10 p-4">
      <p className="font-semibold">{title}</p>
      <SoundHintForm key={`sound:${JSON.stringify(sound)}`} puzzleId={puzzleId} filmId={filmId} hint={sound} />
      <ReviewHintForm
        key={`review:${JSON.stringify(review)}`}
        puzzleId={puzzleId}
        filmId={filmId}
        hint={review}
        names={names}
      />
    </li>
  );
}

function SoundHintForm({ puzzleId, filmId, hint }: { puzzleId: string; filmId: number; hint: SoundHint | null }) {
  const ids = { link: useId(), start: useId(), end: useId() };
  const [link, setLink] = useState(hint ? `https://youtu.be/${hint.youtubeId}` : "");
  const [start, setStart] = useState(hint ? formatSeconds(hint.start) : "");
  const [end, setEnd] = useState(hint ? formatSeconds(hint.end) : "");
  const [preview, setPreview] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [loadingVideos, startLoadingVideos] = useTransition();
  const { pending, error, run } = useAdminAction();

  const loadVideos = () =>
    startLoadingVideos(async () => {
      setVideosError(null);
      const response = await fetch(`/api/admin/tmdb/movies/${filmId}/videos`);
      const body = (await response.json()) as { videos?: Video[]; error?: string };
      if (!response.ok) setVideosError(body.error ?? "Could not load videos.");
      else setVideos(body.videos ?? []);
    });

  const youtubeId = parseYoutubeId(link);
  const startSeconds = parseSeconds(start);
  const endSeconds = parseSeconds(end);
  const valid =
    youtubeId !== null &&
    startSeconds !== null &&
    endSeconds !== null &&
    Number.isInteger(startSeconds) &&
    Number.isInteger(endSeconds) &&
    endSeconds > startSeconds;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-semibold">Sound hint</legend>
      <p className="text-sm text-ink-soft">
        An official trailer or clip on YouTube, and about two seconds of it. Players see YouTube&apos;s player as in the
        preview, video title and thumbnail included, so a video whose title doesn&apos;t name the film makes a fairer
        hint.
      </p>
      <button
        type="button"
        onClick={loadVideos}
        disabled={loadingVideos}
        className="self-start text-sm underline-offset-2 hover:underline disabled:opacity-40"
      >
        {loadingVideos ? "Loading…" : videos ? "Reload trailers from TMDB" : "Show trailers from TMDB"}
      </button>
      {videosError && (
        <p role="alert" className="text-sm text-marker">
          {videosError}
        </p>
      )}
      {videos && videos.length === 0 && <p className="text-sm text-ink-soft">TMDB lists no videos for this film.</p>}
      {videos && videos.length > 0 && (
        <ul
          aria-label="Videos on TMDB"
          className="flex max-h-48 flex-col overflow-y-auto rounded-lg border border-ink/10"
        >
          {videos.map((video) => (
            <li key={video.key}>
              <button
                type="button"
                onClick={() => setLink(`https://youtu.be/${video.key}`)}
                aria-pressed={youtubeId === video.key}
                className="w-full px-3 py-2 text-left text-sm hover:bg-ink/5 aria-pressed:bg-ink aria-pressed:text-table"
              >
                {video.name}{" "}
                <span className="opacity-70">
                  ({video.official ? "official " : ""}
                  {video.type.toLowerCase()})
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_7rem_7rem]">
        <label htmlFor={ids.link} className="sr-only">
          YouTube link
        </label>
        <input
          id={ids.link}
          value={link}
          placeholder="YouTube link"
          onChange={(event) => setLink(event.target.value)}
          className={inputClass}
        />
        <label htmlFor={ids.start} className="sr-only">
          Start (minutes:seconds)
        </label>
        <input
          id={ids.start}
          value={start}
          placeholder="Start 1:23"
          onChange={(event) => setStart(event.target.value)}
          className={inputClass}
        />
        <label htmlFor={ids.end} className="sr-only">
          End (minutes:seconds)
        </label>
        <input
          id={ids.end}
          value={end}
          placeholder="End 1:25"
          onChange={(event) => setEnd(event.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <button
          type="button"
          disabled={!valid}
          onClick={() =>
            setPreview(
              `https://www.youtube-nocookie.com/embed/${youtubeId}?start=${startSeconds}&end=${endSeconds}&rel=0&playsinline=1`,
            )
          }
          className="underline-offset-2 hover:underline disabled:opacity-40"
        >
          Preview
        </button>
        <button
          type="button"
          disabled={!valid || pending}
          onClick={() =>
            run(() => saveSoundHint(puzzleId, filmId, { youtube: link, start: startSeconds, end: endSeconds }))
          }
          className="font-semibold underline-offset-2 hover:underline disabled:opacity-40"
        >
          {hint ? "Save changes" : "Save sound hint"}
        </button>
        {hint && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => removeSoundHint(puzzleId, filmId))}
            className="underline-offset-2 hover:underline disabled:opacity-40"
          >
            Remove
          </button>
        )}
      </div>
      {link && !youtubeId && <p className="text-sm text-marker">That isn&apos;t a YouTube link.</p>}
      {(start || end) && !valid && youtubeId && (
        <p className="text-sm text-ink-soft">Use whole seconds, with the end after the start, like 1:23 to 1:25.</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-marker">
          {error}
        </p>
      )}
      {preview && (
        <div className="aspect-video w-full max-w-md overflow-hidden rounded-[4px] bg-black">
          <iframe
            src={preview}
            title="Sound hint preview"
            allow="autoplay; encrypted-media"
            className="h-full w-full"
          />
        </div>
      )}
    </fieldset>
  );
}

function ReviewHintForm({
  puzzleId,
  filmId,
  hint,
  names,
}: {
  puzzleId: string;
  filmId: number;
  hint: ReviewHint | null;
  names: NamesToBlank;
}) {
  const ids = { excerpt: useId(), author: useId() };
  const [excerpt, setExcerpt] = useState(hint?.excerpt ?? "");
  const [author, setAuthor] = useState(hint?.author ?? "");
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ excerpt: string; author: string }[]>([]);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggesting, startSuggesting] = useTransition();
  const [loadingReviews, startLoading] = useTransition();
  const { pending, error, run } = useAdminAction();
  const reviewRefs = useRef(new Map<string, HTMLElement>());

  const loadReviews = () =>
    startLoading(async () => {
      setReviewsError(null);
      const response = await fetch(`/api/admin/tmdb/movies/${filmId}/reviews`);
      const body = (await response.json()) as { reviews?: Review[]; error?: string };
      if (!response.ok) setReviewsError(body.error ?? "Could not load reviews.");
      else setReviews(body.reviews ?? []);
    });

  const takeSelection = (review: Review) => {
    const selection = window.getSelection();
    const node = reviewRefs.current.get(review.id);
    const text = selection?.toString().trim();
    if (!text || !node || !selection?.anchorNode || !node.contains(selection.anchorNode)) {
      setReviewsError("Select a passage inside that review first.");
      return;
    }
    setReviewsError(null);
    setExcerpt(blankNames(text, names));
    setAuthor(review.author);
  };

  const suggest = () =>
    startSuggesting(async () => {
      setSuggestError(null);
      const result = await suggestReviewHint(filmId);
      if (result.ok) setSuggestions(result.excerpts);
      else setSuggestError(result.error);
    });

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-semibold">Review hint</legend>
      <p className="text-sm text-ink-soft">
        A line from a TMDB review. Names of the film, cast, characters and director are blanked automatically; check the
        result before saving.
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <button
          type="button"
          onClick={loadReviews}
          disabled={loadingReviews}
          className="underline-offset-2 hover:underline disabled:opacity-40"
        >
          {loadingReviews ? "Loading…" : reviews ? "Reload reviews" : "Show TMDB reviews"}
        </button>
        <button
          type="button"
          onClick={suggest}
          disabled={suggesting}
          className="underline-offset-2 hover:underline disabled:opacity-40"
        >
          {suggesting ? "Reading the reviews…" : "Suggest excerpts"}
        </button>
      </div>
      {(reviewsError || suggestError) && (
        <p role="alert" className="text-sm text-marker">
          {reviewsError ?? suggestError}
        </p>
      )}
      {suggestions.length > 0 && (
        <ul aria-label="Suggested excerpts" className="flex flex-col gap-2">
          {suggestions.map((s) => (
            <li key={s.excerpt}>
              <button
                type="button"
                onClick={() => {
                  setExcerpt(s.excerpt);
                  setAuthor(s.author);
                }}
                className="w-full rounded-lg bg-ink/5 p-3 text-left text-sm hover:bg-ink/10"
              >
                &ldquo;{s.excerpt}&rdquo; <span className="text-ink-soft">({s.author})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {reviews && reviews.length === 0 && <p className="text-sm text-ink-soft">TMDB has no reviews for this film.</p>}
      {reviews && reviews.length > 0 && (
        <ul className="flex max-h-80 flex-col gap-3 overflow-y-auto rounded-lg border border-ink/10 p-3">
          {reviews.map((review) => (
            <li key={review.id} className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold">
                {review.author}
                {review.rating !== null && <span className="font-normal text-ink-soft"> ({review.rating}/10)</span>}
              </p>
              <p
                ref={(node) => {
                  if (node) reviewRefs.current.set(review.id, node);
                  else reviewRefs.current.delete(review.id);
                }}
                className="whitespace-pre-line text-sm leading-snug"
              >
                {review.content}
              </p>
              <button
                type="button"
                onClick={() => takeSelection(review)}
                className="self-start text-sm font-semibold underline-offset-2 hover:underline"
              >
                Use selected text
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.excerpt} className="text-sm font-semibold">
            Excerpt
          </label>
          <textarea
            id={ids.excerpt}
            value={excerpt}
            rows={3}
            onChange={(event) => setExcerpt(event.target.value)}
            className={`${inputClass} py-2`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.author} className="text-sm font-semibold">
            Reviewer
          </label>
          <input
            id={ids.author}
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <button
          type="button"
          disabled={pending || !excerpt.trim() || !author.trim()}
          onClick={() => run(() => saveReviewHint(puzzleId, filmId, { excerpt, author }))}
          className="font-semibold underline-offset-2 hover:underline disabled:opacity-40"
        >
          {hint ? "Save changes" : "Save review hint"}
        </button>
        {hint && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => removeReviewHint(puzzleId, filmId))}
            className="underline-offset-2 hover:underline disabled:opacity-40"
          >
            Remove
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-marker">
          {error}
        </p>
      )}
    </fieldset>
  );
}
