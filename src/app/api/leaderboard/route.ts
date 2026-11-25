import { submitResponse } from "@/lib/leaderboard/handlers";

/** Posts a finished daily under a name; the server replays the moves to score it. */
export function POST(request: Request) {
  return submitResponse(request);
}
