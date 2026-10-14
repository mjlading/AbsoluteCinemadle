import { adminOnlyResponse } from "@/lib/admin/auth";
import { errorResponse } from "@/lib/http";
import { getReviews } from "@/lib/tmdb/cached";

/** A film's TMDB user reviews, for picking a review hint. */
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/tmdb/movies/[tmdbId]/reviews">) {
  const denied = await adminOnlyResponse();
  if (denied) return denied;
  const tmdbId = Number((await ctx.params).tmdbId);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return errorResponse(400, "Unknown film.");
  try {
    return Response.json({ reviews: await getReviews(tmdbId) });
  } catch (error) {
    console.error("TMDB reviews failed", error);
    return errorResponse(502, "TMDB is not answering. Try again in a moment.");
  }
}
