/** What an admin server action reports back to the form that called it. */
export type ActionResult = { ok: true } | { ok: false; error: string };
