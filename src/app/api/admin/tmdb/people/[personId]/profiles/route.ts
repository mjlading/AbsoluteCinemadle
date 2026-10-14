import { adminOnlyResponse } from "@/lib/admin/auth";
import { errorResponse } from "@/lib/http";
import { getPersonProfiles } from "@/lib/tmdb/cached";

/** Every TMDB photo of a person, so the admin can pick one from the film's era. */
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/tmdb/people/[personId]/profiles">) {
  const denied = await adminOnlyResponse();
  if (denied) return denied;
  const personId = Number((await ctx.params).personId);
  if (!Number.isInteger(personId) || personId <= 0) return errorResponse(400, "Unknown person.");
  try {
    return Response.json({ profiles: await getPersonProfiles(personId) });
  } catch (error) {
    console.error("TMDB person images failed", error);
    return errorResponse(502, "TMDB is not answering. Try again in a moment.");
  }
}
