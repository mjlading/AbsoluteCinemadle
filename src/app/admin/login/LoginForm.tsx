"use client";

import { useActionState } from "react";

import { login, type LoginState } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="mt-8 flex flex-col gap-3">
      <label htmlFor="password" className="font-semibold">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "login-error" : undefined}
        className="min-h-11 rounded-lg border-[1.5px] border-ink/40 bg-surface px-3 focus:border-ink"
      />
      {state.error && (
        <p id="login-error" role="alert" className="text-sm text-marker">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 min-h-11 rounded-full bg-ink px-6 font-semibold text-table disabled:opacity-50"
      >
        {pending ? "Signing in\u2026" : "Sign in"}
      </button>
    </form>
  );
}
