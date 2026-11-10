import { addDays, utcIsoDate } from "@/lib/dates";
import { listSoundbytesDays } from "@/lib/soundbytes/source";

/**
 * The days that have a Soundbytes board, newest first. Nothing later than
 * tomorrow in UTC, the latest any player's local date can be; the client drops
 * what is still ahead of the player's own date.
 */
export async function GET() {
  const days = await listSoundbytesDays(addDays(utcIsoDate(), 1));
  return Response.json({ days }, { headers: { "Cache-Control": "no-store" } });
}
