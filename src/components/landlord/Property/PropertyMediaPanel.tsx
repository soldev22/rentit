"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type Photo = { url: string; blobName: string; isHero?: boolean };

export default function PropertyMediaPanel({
  propertyId,
  initialPhotos,
  onChange,
}: {
  propertyId: string;
  initialPhotos: Photo[];
  onChange?: (photos: Photo[]) => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const heroBlob = useMemo(() => {
    const hero = photos.find((p) => p.isHero);
    return hero?.blobName ?? (photos[0]?.blobName ?? null);
  }, [photos]);

  function commit(next: Photo[]) {
    setPhotos(next);
    onChange?.(next);
  }

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setErr(null);
    setBusy("Uploading...");

    try {
      const fd = new FormData();
      // use "files" for multi
      Array.from(fileList).forEach((f) => fd.append("files", f));

      const res = await fetch(`/api/landlord/properties/${propertyId}/photos`, {
        method: "POST",
        body: fd,
      });

      const data = (await res.json()) as { ok?: boolean; uploaded?: Photo[]; error?: string };

      if (!res.ok) throw new Error(data.error || "Upload failed");

      const uploaded = data.uploaded ?? [];
      // If we had no photos, server marks first upload as hero; keep that.
      commit([...photos, ...uploaded]);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function setHero(blobName: string) {
    setErr(null);
    setBusy("Setting hero...");

    try {
      const res = await fetch(
        `/api/landlord/properties/${propertyId}/photos/hero`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blobName }),
        }
      );

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to set hero");

      commit(
        photos.map((p) => ({
          ...p,
          isHero: p.blobName === blobName,
        }))
      );
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to set hero");
    } finally {
      setBusy(null);
    }
  }

  async function deletePhoto(blobName: string) {
    if (!confirm("Delete this image?")) return;

    setErr(null);
    setBusy("Deleting...");

    try {
      const res = await fetch(`/api/landlord/properties/${propertyId}/photos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blobName }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to delete image");

      const next = photos.filter((p) => p.blobName !== blobName);

      // If we deleted the hero, we’ll let the API reassign, but UI should match immediately:
      if (blobName === heroBlob && next.length > 0) {
        next[0] = { ...next[0], isHero: true };
      }
      commit(next);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Photos</div>
          <div className="text-xs text-gray-500">
            Upload, delete, and choose a hero image
          </div>
        </div>

        <label className="inline-flex items-center gap-2">
          <input
            type="file"
            title="Upload property images"
            aria-label="Upload property images"
            className="hidden"
            multiple
            accept="image/*"
            onChange={(e) => uploadFiles(e.target.files)}
          />
          <span className="cursor-pointer rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white">
            Upload
          </span>
        </label>
      </div>

      {busy && (
        <div className="text-sm text-gray-700 rounded border p-2 bg-gray-50">
          {busy}
        </div>
      )}

      {err && (
        <div className="text-sm text-red-700 rounded border border-red-200 p-2 bg-red-50">
          {err}
        </div>
      )}

      {photos.length === 0 ? (
        <div className="text-sm text-gray-500 border rounded p-3">
          No images yet. Upload some to get started.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {photos.map((p, idx) => {
            const isHero = p.blobName === heroBlob || !!p.isHero;
            return (
              <div key={p.blobName} className="border rounded-lg p-2">
                <div className="relative">
                  <Image
                    src={p.url}
                    alt={`Property photo ${idx + 1}`}
                    width={160}
                    height={120}
                    className="w-full h-auto rounded"
                  />
                  {isHero && (
                    <div className="absolute top-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                      Hero
                    </div>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="text-xs font-semibold underline"
                    onClick={() => setHero(p.blobName)}
                    disabled={!!busy}
                    title="Set as hero image"
                  >
                    Set hero
                  </button>

                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600 underline"
                    onClick={() => deletePhoto(p.blobName)}
                    disabled={!!busy}
                    title="Delete image"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-xs text-gray-500">
        Tip: The hero image is used on cards and listings. If none is selected,
        the first image is treated as hero.
      </div>
    </div>
  );
  
}

