import { errorResponse } from "@/lib/http";
import { searchMovies } from "@/lib/tmdb/cached";
import { rankSuggestions } from "@/lib/game/match";

const MAX_SUGGESTIONS = 8;

/**
 * Title suggestions for the guess boxes. Results only echo what the
 * player typed, so they reveal nothing; TMDB lookups are cached on the server.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (query.length < 2) return Response.json({ results: [] });
  try {
    const results = rankSuggestions(query, await searchMovies(query))
      .slice(0, MAX_SUGGESTIONS)
      .map(({ tmdbId, title, year }) => ({ tmdbId, title, year }));
    return Response.json({ results }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (error) {
    console.error("Film suggestions failed", error);
    return errorResponse(502, "Suggestions are unavailable right now.");
  }
}
