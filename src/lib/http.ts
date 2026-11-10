import "server-only";

import type { z } from "zod";

import { parseByteRange } from "./byte-range";

export function errorResponse(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Parses a JSON request body against a schema, or returns the 400 response to send instead. */
export async function parseJsonBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T> | Response> {
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

/**
 * Serves bytes whole, or the part a `Range` header asks for, since media players expect
 * byte ranges. Only whole responses carry `cacheControl`; partial ones are never cached,
 * so a CDN can't hand Safari's two-byte probe to the next player as the whole file.
 */
export function bytesResponse(request: Request, data: Uint8Array, contentType: string, cacheControl: string): Response {
  const size = data.byteLength;
  const range = parseByteRange(request.headers.get("range"), size);
  const common = { "Content-Type": contentType, "Accept-Ranges": "bytes" };
  if (range === "unsatisfiable") {
    return new Response(null, {
      status: 416,
      headers: { ...common, "Content-Range": `bytes */${size}`, "Cache-Control": "no-store" },
    });
  }
  if (range) {
    return new Response(data.subarray(range.start, range.end + 1) as BodyInit, {
      status: 206,
      headers: {
        ...common,
        "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
        "Content-Length": String(range.end - range.start + 1),
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response(data as BodyInit, {
    headers: { ...common, "Content-Length": String(size), "Cache-Control": cacheControl },
  });
}
