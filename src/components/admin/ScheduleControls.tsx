"use client";

import { useId, useState, useTransition } from "react";

import { deletePuzzle, schedulePuzzle, unschedulePuzzle } from "@/app/admin/actions";
import { formatPuzzleDate } from "@/lib/dates";
import { ConfirmButton } from "./ConfirmButton";
import { useAdminAction } from "./use-admin-action";

/** Scheduling, unscheduling and deleting a puzzle. */
export function ScheduleControls({
  puzzleId,
  date,
  suggestedDate,
  blocked,
}: {
  puzzleId: string;
  date: string | null;
  /** The first free day coming up, offered as the default. */
  suggestedDate: string;
  /** True while the grid has errors. */
  blocked: boolean;
}) {
  const dateId = useId();
  const [value, setValue] = useState(date ?? suggestedDate);
  const { pending, error, run } = useAdminAction();
  const [deleting, startDelete] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      {date && (
        <p>
          Scheduled for <strong className="font-semibold">{formatPuzzleDate(date)}</strong> ({date}).
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={dateId} className="text-sm font-semibold">
            {date ? "Move to" : "Date"}
          </label>
          <input
            id={dateId}
            type="date"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="min-h-11 rounded-lg border-[1.5px] border-ink/30 bg-surface px-3"
          />
        </div>
        <button
          type="button"
          disabled={pending || blocked || !value || value === date}
          onClick={() => run(() => schedulePuzzle(puzzleId, value))}
          className="min-h-11 rounded-full bg-ink px-6 font-semibold text-table disabled:opacity-35"
        >
          {date ? "Move" : "Schedule"}
        </button>
        {date && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => unschedulePuzzle(puzzleId))}
            className="min-h-11 rounded-full border-[1.5px] border-ink px-5 font-semibold disabled:opacity-35"
          >
            Unschedule
          </button>
        )}
      </div>
      {blocked && <p className="text-sm text-ink-soft">Scheduling unlocks once the problems above are fixed.</p>}
      {error && (
        <p role="alert" className="text-sm text-marker">
          {error}
        </p>
      )}
      <ConfirmButton
        disabled={deleting}
        onConfirm={() => startDelete(() => deletePuzzle(puzzleId))}
        confirmLabel="Click again to delete this puzzle for good"
        className="self-start text-sm underline-offset-2 hover:underline"
      >
        Delete puzzle
      </ConfirmButton>
    </div>
  );
}
