import { revalidateTag } from "next/cache";
import sharp from "sharp";
import { z } from "zod";

import { adminOnlyResponse } from "@/lib/admin/auth";
import { saveBarcodeUpload } from "@/lib/admin/puzzles";
import { errorResponse } from "@/lib/http";
import { loadPuzzle, PUZZLES_TAG } from "@/lib/puzzle/repository";

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * Replaces a film's generated barcode with an uploaded image. The image is
 * re-encoded (which also strips metadata) and scaled down before storing.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/puzzles/[id]/films/[filmId]/barcode">) {
  const denied = await adminOnlyResponse();
  if (denied) return denied;
  const { id, filmId: filmParam } = await ctx.params;
  const filmId = Number(filmParam);
  const puzzle = z.uuid().safeParse(id).success ? await loadPuzzle(id) : null;
  if (!puzzle || !puzzle.films.some((f) => f.tmdbId === filmId)) {
    return errorResponse(404, "That film is not in this puzzle.");
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return errorResponse(400, "Choose an image to upload.");
  if (!ACCEPTED.has(file.type)) return errorResponse(400, "Upload a PNG, JPEG or WebP image.");
  if (file.size > MAX_BYTES) return errorResponse(400, "Keep the image under 4 MB.");

  let data: Buffer;
  try {
    data = await sharp(Buffer.from(await file.arrayBuffer()))
      .resize({ width: 1600, height: 400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();
  } catch {
    return errorResponse(400, "That file could not be read as an image.");
  }
  await saveBarcodeUpload(id, filmId, "image/webp", data);
  // updateTag only works in server actions; expire 0 has the same read-your-own-writes effect here.
  revalidateTag(PUZZLES_TAG, { expire: 0 });
  return Response.json({ ok: true });
}
