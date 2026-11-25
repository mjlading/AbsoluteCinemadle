"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  adoptLeaderboardCode,
  fetchDaily,
  hasPosted,
  leaderboardToken,
  postResult,
  savedName,
  type LeaderboardMoves,
} from "@/lib/leaderboard/client";
import { NAME_MAX } from "@/lib/leaderboard/names";
import type { DailyEntry } from "@/lib/leaderboard/types";

/**
 * Placeholder UI (the look is still to be designed): once a daily is over, a
 * name box to post the result, and everyone's results for the same day.
 */
export function DailyLeaderboard({ boardId, date, moves }: { boardId: string; date: string; moves: LeaderboardMoves }) {
  const game = moves.game;
  const [entries, setEntries] = useState<DailyEntry[] | null>(null);
  const [name, setName] = useState("");
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // localStorage is only there after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(savedName());
    setPosted(hasPosted(game, date));
    fetchDaily(game, date).then(setEntries, () => setEntries([]));
  }, [game, date]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await postResult(boardId, date, name, moves);
      setPosted(true);
      setEntries(await fetchDaily(game, date));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't post that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="leaderboard-day" className="mt-4 rounded-lg p-3 ring-1 ring-ink/20">
      <h2 id="leaderboard-day" className="font-semibold">
        Leaderboard
      </h2>
      {!posted && (
        <form onSubmit={submit} className="mt-2 flex gap-2">
          <label className="sr-only" htmlFor="leaderboard-name">
            Your name
          </label>
          <input
            id="leaderboard-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX}
            placeholder="Your name"
            required
            className="min-w-0 flex-1 rounded border border-ink/30 bg-transparent px-2 py-1"
          />
          <button type="submit" disabled={busy} className="rounded border border-ink/30 px-3 py-1">
            Post
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm">
          {error}
        </p>
      )}
      {entries === null ? (
        <p className="mt-2 text-sm">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="mt-2 text-sm">No one has posted yet.</p>
      ) : (
        <ol aria-label="Results for this day" className="mt-2 text-sm">
          {entries.map((e, i) => (
            <li key={e.name} className={e.mine ? "font-semibold" : ""}>
              {i + 1}. {e.name}: {e.summary} ({e.score} {e.score === 1 ? "point" : "points"})
            </li>
          ))}
        </ol>
      )}
      <p className="mt-2 text-sm">
        <Link href="/leaderboard" className="underline">
          All-time leaderboard
        </Link>
      </p>
      <CodeTools />
    </section>
  );
}

/** Moving a name to another device: show this browser's code, or take one from elsewhere. */
export function CodeTools() {
  const [code, setCode] = useState<string | null>(null);
  const [entered, setEntered] = useState("");
  const [note, setNote] = useState<string | null>(null);
  return (
    <details className="mt-2 text-sm">
      <summary>Play on another device?</summary>
      <p className="mt-1">Your name is kept by this browser. To use it elsewhere, copy this code there.</p>
      {code ? (
        <code className="block break-all">{code}</code>
      ) : (
        <button type="button" className="underline" onClick={() => setCode(leaderboardToken())}>
          Show my code
        </button>
      )}
      <form
        className="mt-1 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setNote(adoptLeaderboardCode(entered) ? "Code saved: post as your name now." : "That isn't a valid code.");
        }}
      >
        <label className="sr-only" htmlFor="leaderboard-code">
          Code from another device
        </label>
        <input
          id="leaderboard-code"
          value={entered}
          onChange={(e) => setEntered(e.target.value)}
          placeholder="Code from another device"
          className="min-w-0 flex-1 rounded border border-ink/30 bg-transparent px-2 py-1"
        />
        <button type="submit" className="rounded border border-ink/30 px-3 py-1">
          Use
        </button>
      </form>
      {note && <p role="status">{note}</p>}
    </details>
  );
}
