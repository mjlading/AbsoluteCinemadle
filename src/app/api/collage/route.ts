import { listCollageNames } from "@/lib/collage/source";

/** The keyword collage puzzles there are, by spoiler-free name. */
export async function GET() {
  const puzzles = await listCollageNames();
  return Response.json({ puzzles }, { headers: { "Cache-Control": "no-store" } });
}
