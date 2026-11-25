import { searchResponse } from "@/lib/warmer/source";

/** Title suggestions from the game's film list. */
export function GET(request: Request) {
  return searchResponse(new URL(request.url).searchParams.get("q") ?? "");
}
