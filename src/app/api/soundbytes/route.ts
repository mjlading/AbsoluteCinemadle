import { listBoardsResponse } from "@/lib/soundbytes/handlers";

/** The Soundbytes boards there are, by spoiler-free name. */
export function GET() {
  return listBoardsResponse();
}
