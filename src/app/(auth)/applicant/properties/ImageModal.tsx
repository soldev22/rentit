"use client";
import { useEffect } from "react";

export default function ImageModal({ open, src, alt, onClose }: { open: boolean, src: string, alt?: string, onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="relative" onClick={e => e.stopPropagation()}>
        <img src={src} alt={alt} className="max-h-[92vh] max-w-[98vw] rounded-xl shadow-2xl" style={{ minWidth: '320px', minHeight: '200px' }} />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold hover:bg-black/80"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}
