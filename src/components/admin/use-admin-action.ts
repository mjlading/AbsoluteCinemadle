"use client";

import { useState, useTransition } from "react";

import type { ActionResult } from "@/lib/admin/action-result";

/** Runs an admin server action in a transition and keeps its error message for display. */
export function useAdminAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result.ok) onSuccess?.();
      else setError(result.error);
    });
  }

  return { pending, error, run, clearError: () => setError(null) };
}
