import { errorResponse } from "@/lib/http";
import { mergeSuggestions } from "@/lib/soundbytes/suggest";
import { searchMovies, searchPeople } from "@/lib/tmdb/cached";

/**
 * Film and actor suggestions for the Soundbytes guess box. Like the title
 * search, results only echo what the player typed; TMDB lookups are cached.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (query.length < 2) return Response.json({ results: [] });
  try {
    const [films, people] = await Promise.all([searchMovies(query), searchPeople(query)]);
    return Response.json(
      { results: mergeSuggestions(query, films, people) },
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch (error) {
    console.error("Film and actor suggestions failed", error);
    return errorResponse(502, "Suggestions are unavailable right now.");
  }
}
