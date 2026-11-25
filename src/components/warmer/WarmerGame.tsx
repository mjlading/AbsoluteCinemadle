"use client";

import { useEffect, useRef, useState } from "react";

import { addDays, localIsoDate } from "@/lib/dates";
import { request } from "@/lib/game/api";
import { readJson, writeJson } from "@/lib/game/storage";
import type { RankedFilm, WarmerClue, WarmerDay, WarmerFilm } from "@/lib/warmer/types";

/*
 * Placeholder UI for Warmer (the look is still to be designed): guess films, see how
 * close each is to the hidden one by rank, and use hints and clues when stuck.
 */

interface Saved {
  guesses: RankedFilm[];
  status: "playing" | "won" | "lost";
  answer: RankedFilm | null;
  clues?: WarmerClue[];
}

/** Guesses (not hints) needed before each fact about the hidden film can be unlocked. */
const CLUES: { kind: WarmerClue["kind"]; label: string; after: number }[] = [
  { kind: "decade", label: "Decade", after: 5 },
  { kind: "genres", label: "Genres", after: 10 },
];

const storageKey = (date: string) => `warmer:${date}`;
const post = <T,>(date: string, body: object) =>
  request<T>(`/api/warmer/day/${date}`, { method: "POST", body: JSON.stringify(body) });

/** Contexto's colours: green when close, yellow when warm, red when cold. */
const heat = (rank: number) => (rank <= 50 ? "#3fb57a" : rank <= 300 ? "#e0b23a" : "#d9534f");

function shareText(date: string, saved: Saved): string {
  const guesses = saved.guesses.filter((g) => !g.hint);
  const hints = saved.guesses.length - guesses.length;
  const squares = guesses.map((g) => (g.rank <= 50 ? "🟩" : g.rank <= 300 ? "🟨" : "🟥")).join("");
  const result = saved.status === "won" ? `${guesses.length} guesses, ${hints} hints` : "gave up";
  return `Warmer ${date}: ${result}\n${squares}`;
}

export function WarmerGame() {
  const [date, setDate] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [saved, setSaved] = useState<Saved>({ guesses: [], status: "playing", answer: null });
  const [last, setLast] = useState<RankedFilm | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<WarmerFilm[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get("date");
    const d = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : localIsoDate();
    // The date and saved game come from the player's clock and storage, both only there after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(d);
    const stored = readJson<Saved>(storageKey(d));
    if (stored) setSaved(stored);
    request<WarmerDay>(`/api/warmer/day/${d}`).then(
      (day) => setTotal(day.total),
      () => setMessage("There's no game for this day."),
    );
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/warmer/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => r.json() as Promise<{ results: WarmerFilm[] }>)
        .then(
          ({ results }) => setSuggestions(results),
          () => {},
        );
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function save(next: Saved) {
    setSaved(next);
    if (date) writeJson(storageKey(date), next);
  }

  async function run<T>(body: object, then: (r: T) => void) {
    if (!date || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      then(await post<T>(date, body));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function guess(film: WarmerFilm) {
    setQuery("");
    setSuggestions([]);
    input.current?.focus();
    const earlier = saved.guesses.find((g) => g.film.id === film.id);
    if (earlier) {
      setLast(earlier);
      setMessage(`Already tried ${film.title}.`);
      return;
    }
    void run<{ result: RankedFilm }>({ action: "guess", id: film.id }, ({ result }) => {
      setLast(result);
      const won = result.rank === 1;
      save({
        ...saved,
        guesses: [...saved.guesses, result],
        status: won ? "won" : "playing",
        answer: won ? result : null,
      });
    });
  }

  function hint() {
    void run<{ result: RankedFilm | null }>(
      { action: "hint", guessed: saved.guesses.map((g) => g.film.id) },
      ({ result }) => {
        if (!result) {
          setMessage("You're as close as it gets: your best guess is #2.");
          return;
        }
        setLast(result);
        save({ ...saved, guesses: [...saved.guesses, result] });
      },
    );
  }

  function clue(kind: WarmerClue["kind"]) {
    void run<{ clue: WarmerClue }>({ action: "clue", kind }, ({ clue }) =>
      save({ ...saved, clues: [...(saved.clues ?? []), clue] }),
    );
  }

  function giveUp() {
    void run<{ result: RankedFilm }>({ action: "reveal" }, ({ result }) =>
      save({ ...saved, status: "lost", answer: result }),
    );
  }

  if (!date) return <p>Loading…</p>;
  // Suggestions for an earlier, longer query aren't shown once the box is nearly empty.
  const shown = query.trim().length >= 2 ? suggestions : [];
  const sorted = [...saved.guesses].sort((a, b) => a.rank - b.rank);
  const guessCount = saved.guesses.filter((g) => !g.hint).length;
  const hintCount = saved.guesses.length - guessCount;
  const clues = saved.clues ?? [];

  return (
    <div className="flex flex-col gap-4">
      <p>
        A film is hidden. Guess any film: you&apos;ll see how close it is to the hidden one, ranked out of{" "}
        {total ?? "…"} (#1 is the film itself). Use what&apos;s warm to close in.
      </p>

      {saved.status === "playing" ? (
        <div className="relative">
          <label htmlFor="warmer-guess" className="sr-only">
            Guess a film
          </label>
          <input
            ref={input}
            id="warmer-guess"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && shown[0]) guess(shown[0]);
            }}
            placeholder="Type a film…"
            autoComplete="off"
            className="w-full rounded border border-ink/30 bg-transparent px-3 py-2"
          />
          {shown.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded border border-ink/30 bg-surface">
              {shown.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => guess(s)}
                    className="flex w-full items-center gap-2 px-2 py-1 text-left hover:bg-ink/10"
                  >
                    <Thumb film={s} />
                    <span>
                      {s.title} <span className="text-ink-soft">{s.year}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <button type="button" onClick={hint} disabled={busy} className="underline">
              Hint
            </button>
            {CLUES.filter((c) => !clues.some((k) => k.kind === c.kind)).map((c) => (
              <button
                key={c.kind}
                type="button"
                onClick={() => clue(c.kind)}
                disabled={busy || guessCount < c.after}
                className="underline disabled:no-underline disabled:opacity-50"
              >
                {c.label} clue{guessCount < c.after ? ` (after ${c.after} guesses)` : ""}
              </button>
            ))}
            <button type="button" onClick={giveUp} disabled={busy} className="underline">
              Give up
            </button>
          </div>
        </div>
      ) : (
        <section aria-label="Result" className="flex items-center gap-3 rounded-lg p-3 ring-1 ring-ink/25">
          {saved.answer?.film.posterUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={saved.answer.film.posterUrl} alt="" width={61} height={92} className="rounded" />
          )}
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold">
              {saved.status === "won" ? "Got it!" : "It was"} {saved.answer?.film.title} ({saved.answer?.film.year})
            </h2>
            <p className="text-sm">
              {guessCount} guesses, {hintCount} hints
            </p>
            <button
              type="button"
              className="self-start rounded border border-ink/30 px-3 py-1"
              onClick={() => navigator.clipboard.writeText(shareText(date, saved)).then(() => setCopied(true))}
            >
              {copied ? "Copied" : "Share"}
            </button>
          </div>
        </section>
      )}

      {clues.length > 0 && (
        <ul aria-label="Clues" className="text-sm">
          {clues.map((c) => (
            <li key={c.kind}>
              <strong>{c.kind === "decade" ? "Decade" : "Genres"}:</strong> {c.value}
            </li>
          ))}
        </ul>
      )}

      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}

      {last && saved.status === "playing" && (
        <div aria-live="polite">
          <p className="text-xs text-ink-soft">{last.hint ? "Hint" : "Last guess"}</p>
          <Row entry={last} total={total} />
        </div>
      )}

      <ol aria-label="Your guesses, closest first" className="flex flex-col gap-1">
        {sorted.map((g) => (
          <li key={g.film.id}>
            <Row entry={g} total={total} />
          </li>
        ))}
      </ol>

      <nav aria-label="Other days" className="flex gap-4 text-sm">
        <a href={`?date=${addDays(date, -1)}`} className="underline">
          ← Previous day
        </a>
        <a href={`?date=${addDays(date, 1)}`} className="underline">
          Next day →
        </a>
      </nav>
    </div>
  );
}

function Thumb({ film }: { film: WarmerFilm }) {
  return film.posterUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={film.posterUrl}
      alt=""
      width={28}
      height={42}
      className="h-[42px] w-[28px] shrink-0 rounded-sm object-cover"
    />
  ) : (
    <span aria-hidden="true" className="h-[42px] w-[28px] shrink-0 rounded-sm bg-ink/10" />
  );
}

/**
 * A film and its rank, on a bar that is fuller the closer it is. Hovering shows the film's
 * description; tapping (or Enter) opens it below, for touch screens.
 */
function Row({ entry, total }: { entry: RankedFilm; total: number | null }) {
  const [open, setOpen] = useState(false);
  // Log scale: the difference between #5 and #50 matters far more than #1500 and #2500.
  const fill = total ? Math.max(4, 100 * (1 - Math.log(entry.rank) / Math.log(total))) : 0;
  return (
    <div className="relative overflow-hidden rounded bg-ink/10">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0"
        style={{ width: `${fill}%`, backgroundColor: heat(entry.rank), opacity: 0.45 }}
      />
      <button
        type="button"
        aria-expanded={open}
        title={entry.film.overview}
        onClick={() => setOpen((o) => !o)}
        className="relative flex w-full items-center gap-2 px-2 py-1 text-left"
      >
        <Thumb film={entry.film} />
        <span className="min-w-0 flex-1 truncate">
          {entry.film.title} <span className="text-ink-soft">{entry.film.year}</span>
          {entry.hint && <span className="text-ink-soft"> (hint)</span>}
        </span>
        <span className="font-semibold tabular-nums">#{entry.rank}</span>
      </button>
      {open && <p className="relative px-2 pb-2 text-sm">{entry.film.overview || "No description."}</p>}
    </div>
  );
}
