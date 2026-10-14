import "server-only";

import type { z } from "zod";

export function errorResponse(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Parses a JSON request body against a schema, or returns the 400 response to send instead. */
export async function parseJsonBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T> | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "The request body must be JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorResponse(400, parsed.error.issues[0]?.message ?? "Invalid request body.");
  return parsed.data;
}
