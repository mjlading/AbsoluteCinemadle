import { z } from "zod";

import { errorResponse, parseJsonBody } from "@/lib/http";
import { tileLabel } from "@/lib/puzzle/grid";
import { puzzleOrErrorResponse } from "@/lib/puzzle/source";

const LabelBody = z.object({ tileId: z.string().max(64) });

/** Reveals one tile's label. POST because revealing costs the player points. */
export async function POST(request: Request, ctx: RouteContext<"/api/puzzles/[date]/labels">) {
  const puzzle = await puzzleOrErrorResponse((await ctx.params).date);
  if (puzzle instanceof Response) return puzzle;

  const body = await parseJsonBody(request, LabelBody);
  if (body instanceof Response) return body;

  const label = tileLabel(puzzle, body.tileId);
  if (label === null) return errorResponse(404, "That tile is not in this puzzle.");
  return Response.json({ tileId: body.tileId, label }, { headers: { "Cache-Control": "no-store" } });
}
