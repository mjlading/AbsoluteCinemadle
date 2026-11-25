import { allTimeResponse } from "@/lib/leaderboard/handlers";

/** Totals per name over every day, overall and per game. */
export function GET() {
  return allTimeResponse();
}
