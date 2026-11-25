"use client";

import { useEffect, useState } from "react";

import { fetchAllTime } from "@/lib/leaderboard/client";
import { LEADERBOARD_GAMES, type AllTimeBoards, type AllTimeRow, type LeaderboardGame } from "@/lib/leaderboard/types";

const GAME_NAMES: Record<LeaderboardGame, string> = {
  "close-ups": "Close-Ups",
  "casting-call": "Casting call",
  "ratings-cliff": "Ratings Cliff",
};

/** Placeholder tables: total points, days played and wins per name. */
export function AllTimeLeaderboard() {
  const [boards, setBoards] = useState<AllTimeBoards | null | "failed">(null);

  useEffect(() => {
    fetchAllTime().then(setBoards, () => setBoards("failed"));
  }, []);

  if (boards === null) return <p className="mt-4">Loading…</p>;
  if (boards === "failed") return <p className="mt-4">The leaderboard couldn&apos;t be loaded.</p>;
  return (
    <>
      <Table title="All games" rows={boards.overall} />
      {LEADERBOARD_GAMES.map((g) => (
        <Table key={g} title={GAME_NAMES[g]} rows={boards.games[g]} />
      ))}
    </>
  );
}

function Table({ title, rows }: { title: string; rows: AllTimeRow[] }) {
  return (
    <section aria-label={title} className="mt-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm">No results yet.</p>
      ) : (
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Name</th>
              <th scope="col">Points</th>
              <th scope="col">Days</th>
              <th scope="col">Wins</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name}>
                <td>{i + 1}</td>
                <td>{r.name}</td>
                <td>{r.total}</td>
                <td>{r.days}</td>
                <td>{r.wins}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
