import { useRef, useState } from "react";

export default function PropertyImageUpload({ propertyId, onUploaded }: { propertyId: string, onUploaded: (photo: { url: string, blobName: string }) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fileInputRef.current?.files?.[0]) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", fileInputRef.current.files[0]);
    try {
      const res = await fetch(`/api/properties/${propertyId}/upload-photo`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      onUploaded(data);
      fileInputRef.current.value = "";
    } catch {
      setError("Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleUpload} className="flex items-center gap-2 mt-2">
      <label htmlFor="property-image-upload" className="sr-only">
        Upload property image
      </label>
      <input
        id="property-image-upload"
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="block"
        title="Upload property image"
      />
      <button type="submit" disabled={uploading} className="bg-indigo-600 text-white px-3 py-1 rounded disabled:opacity-50">
        {uploading ? "Uploading..." : "Upload"}
      </button>
      {error && <span className="text-red-500 text-xs ml-2">{error}</span>}
    </form>
  );
}
