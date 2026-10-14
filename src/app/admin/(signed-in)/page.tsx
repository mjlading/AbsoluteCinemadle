import Link from "next/link";
import { Suspense } from "react";

import { requireAdmin } from "@/lib/admin/auth";
import { listDrafts, listScheduled, type PuzzleSummary } from "@/lib/admin/puzzles";
import { addDays, formatPuzzleDate, utcIsoDate } from "@/lib/dates";
import { createPuzzle } from "../actions";

const LOOKAHEAD_DAYS = 14;

export default function AdminHome() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Loading puzzles&hellip;</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  await requireAdmin();
  const today = utcIsoDate();
  const days = Array.from({ length: LOOKAHEAD_DAYS }, (_, i) => addDays(today, i));
  const [scheduled, drafts] = await Promise.all([listScheduled(today, days.at(-1)!), listDrafts()]);
  const byDate = new Map(scheduled.map((p) => [p.date, p]));
  const missing = days.filter((d) => !byDate.has(d));

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-[900] leading-none">Puzzles</h1>
        <form action={createPuzzle}>
          <button type="submit" className="min-h-11 rounded-full bg-ink px-6 font-semibold text-table hover:bg-ink/85">
            New puzzle
          </button>
        </form>
      </div>

      <section aria-labelledby="schedule-heading">
        <h2 id="schedule-heading" className="text-xl font-semibold">
          Next {LOOKAHEAD_DAYS} days
        </h2>
        {missing.length > 0 ? (
          <p role="status" className="mt-2 rounded-lg bg-marker/10 px-4 py-3 text-ink">
            <strong className="font-semibold">
              {missing.length === 1 ? "1 day has" : `${missing.length} days have`} no puzzle.
            </strong>{" "}
            Players see a &ldquo;no puzzle today&rdquo; message on those days.
          </p>
        ) : (
          <p className="mt-2 text-ink-soft">Every day is covered.</p>
        )}
        <ol className="mt-4 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-surface">
          {days.map((date) => {
            const puzzle = byDate.get(date);
            return (
              <li key={date} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3">
                <span className="w-64 shrink-0 font-semibold">
                  {formatPuzzleDate(date)}
                  {date === today && <span className="ml-2 text-sm font-normal text-ink-soft">today</span>}
                </span>
                {puzzle ? (
                  <Link href={`/admin/puzzles/${puzzle.id}`} className="underline-offset-2 hover:underline">
                    {filmList(puzzle)}
                  </Link>
                ) : (
                  <span className="font-semibold text-marker">No puzzle</span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="drafts-heading">
        <h2 id="drafts-heading" className="text-xl font-semibold">
          Drafts
        </h2>
        {drafts.length === 0 ? (
          <p className="mt-2 text-ink-soft">No drafts. Start one with New puzzle.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-surface">
            {drafts.map((draft) => (
              <li key={draft.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <Link href={`/admin/puzzles/${draft.id}`} className="font-semibold underline-offset-2 hover:underline">
                  {draft.films.length > 0 ? filmList(draft) : "Untitled draft"}
                </Link>
                <span className="text-sm text-ink-soft">
                  {draft.films.length} of 4 films, {draft.tileCount} of 16 tiles
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const filmList = (puzzle: PuzzleSummary) => puzzle.films.map((f) => f.title).join(", ") || "No films yet";
