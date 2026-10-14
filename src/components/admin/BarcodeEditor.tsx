"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { regenerateBarcode, removeBarcodeUpload } from "@/app/admin/actions";
import { Barcode } from "@/components/bonus/Barcode";
import { useAdminAction } from "./use-admin-action";

/** One film's barcode in the editor: the generated strip or an upload, with ways to replace either. */
export function BarcodeEditor({
  puzzleId,
  filmId,
  title,
  barcodeId,
  colors,
  upload,
}: {
  puzzleId: string;
  filmId: number;
  title: string;
  barcodeId: string;
  colors: string[] | null;
  upload: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { pending, error, run } = useAdminAction();
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Bumped after each upload so the browser fetches the new image instead of its cached copy.
  const [version, setVersion] = useState(0);
  const busy = pending || uploading;

  const onFile = (file: File | undefined) => {
    if (!file) return;
    startUpload(async () => {
      setUploadError(null);
      const body = new FormData();
      body.set("image", file);
      const response = await fetch(`/api/admin/puzzles/${puzzleId}/films/${filmId}/barcode`, { method: "POST", body });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setUploadError(result?.error ?? "The upload failed.");
        return;
      }
      setVersion((v) => v + 1);
      router.refresh();
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const imageUrl = upload ? `/api/admin/puzzles/${puzzleId}/barcodes/${barcodeId}/image?v=${version}` : null;
  const hasStrip = upload || (colors?.length ?? 0) > 0;

  return (
    <li className="flex flex-col gap-2">
      <p className="font-semibold">
        {title} <span className="font-normal text-ink-soft">{upload ? "(uploaded)" : "(generated from stills)"}</span>
      </p>
      <div className="h-16 overflow-hidden rounded-[4px] bg-sheet p-1">
        {hasStrip ? (
          <Barcode barcode={{ id: barcodeId, colors: upload ? null : colors, imageUrl }} />
        ) : (
          <p className="grid h-full place-items-center text-sm text-white/70">No barcode yet</p>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {!upload && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => regenerateBarcode(puzzleId, filmId))}
            className="underline-offset-2 hover:underline disabled:opacity-50"
          >
            {pending ? "Working…" : "Regenerate from stills"}
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="underline-offset-2 hover:underline disabled:opacity-50"
        >
          {uploading ? "Uploading…" : upload ? "Upload a different image" : "Upload your own"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label={`Barcode image for ${title}`}
          onChange={(event) => onFile(event.target.files?.[0])}
          className="hidden"
        />
        {upload && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => removeBarcodeUpload(puzzleId, filmId))}
            className="underline-offset-2 hover:underline disabled:opacity-50"
          >
            Use the generated strip
          </button>
        )}
      </div>
      {(error || uploadError) && (
        <p role="alert" className="text-sm text-marker">
          {error ?? uploadError}
        </p>
      )}
    </li>
  );
}
