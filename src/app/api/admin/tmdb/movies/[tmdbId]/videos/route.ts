import { adminOnlyResponse } from "@/lib/admin/auth";
import { errorResponse } from "@/lib/http";
import { getVideos } from "@/lib/tmdb/cached";

/** A film's YouTube trailers and clips listed on TMDB, for picking a sound hint. */
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/tmdb/movies/[tmdbId]/videos">) {
  const denied = await adminOnlyResponse();
  if (denied) return denied;
  const tmdbId = Number((await ctx.params).tmdbId);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return errorResponse(400, "Unknown film.");
  try {
    return Response.json({ videos: await getVideos(tmdbId) });
  } catch (error) {
    console.error("TMDB videos failed", error);
    return errorResponse(502, "TMDB is not answering. Try again in a moment.");
  }
}
