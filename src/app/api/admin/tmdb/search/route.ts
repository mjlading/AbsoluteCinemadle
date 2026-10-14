import { adminOnlyResponse } from "@/lib/admin/auth";
import { errorResponse } from "@/lib/http";
import { searchMovies } from "@/lib/tmdb/cached";

export async function GET(request: Request) {
  const denied = await adminOnlyResponse();
  if (denied) return denied;
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return Response.json({ results: [] });
  try {
    return Response.json({ results: (await searchMovies(query)).slice(0, 12) });
  } catch (error) {
    console.error("TMDB search failed", error);
    return errorResponse(502, "TMDB search is not answering. Try again in a moment.");
  }
}
