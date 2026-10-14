import { adminOnlyResponse } from "@/lib/admin/auth";
import { errorResponse } from "@/lib/http";
import { getForeignTitles } from "@/lib/tmdb/cached";
import { countryName, languageName } from "@/lib/warmup/names";

/** A film's release titles around the world, for picking a warm-up card. */
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/tmdb/movies/[tmdbId]/foreign-titles">) {
  const denied = await adminOnlyResponse();
  if (denied) return denied;
  const tmdbId = Number((await ctx.params).tmdbId);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return errorResponse(400, "Unknown film.");
  try {
    const titles = await getForeignTitles(tmdbId);
    return Response.json({
      titles: titles.map((t) => ({
        ...t,
        languageName: t.language ? languageName(t.language) : null,
        countryName: t.country ? countryName(t.country) : null,
      })),
    });
  } catch (error) {
    console.error("TMDB foreign titles failed", error);
    return errorResponse(502, "TMDB is not answering. Try again in a moment.");
  }
}
