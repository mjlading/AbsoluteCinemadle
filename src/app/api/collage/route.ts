import { addDays, utcIsoDate } from "@/lib/dates";
import { listCollageDays } from "@/lib/collage/source";

/**
 * The days that have a Close-Ups puzzle, newest first. Nothing later than
 * tomorrow in UTC, the latest any player's local date can be; the client drops
 * what is still ahead of the player's own date.
 */
export async function GET() {
  const days = await listCollageDays(addDays(utcIsoDate(), 1));
  return Response.json({ days }, { headers: { "Cache-Control": "no-store" } });
}
