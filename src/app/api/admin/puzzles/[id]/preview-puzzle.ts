import "server-only";

import { z } from "zod";

import { adminOnlyResponse } from "@/lib/admin/auth";
import { errorResponse } from "@/lib/http";
import { loadPuzzle } from "@/lib/puzzle/repository";
import type { Puzzle } from "@/lib/puzzle/types";

/** The draft or scheduled puzzle an admin preview is playing, or the error response to return. */
export async function previewPuzzleOrErrorResponse(id: string): Promise<Puzzle | Response> {
  const denied = await adminOnlyResponse();
  if (denied) return denied;
  const puzzle = z.uuid().safeParse(id).success ? await loadPuzzle(id) : null;
  return puzzle ?? errorResponse(404, "That puzzle does not exist.");
}
