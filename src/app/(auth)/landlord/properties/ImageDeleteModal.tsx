import { useState } from "react";

export default function ImageDeleteModal({ open, onClose, onDelete }: { open: boolean, onClose: () => void, onDelete: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg p-6 shadow-lg min-w-[260px]">
        <h3 className="text-base font-semibold mb-2">Delete Image?</h3>
        <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this image? This cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded text-sm">Cancel</button>
          <button onClick={onDelete} className="px-3 py-1 rounded bg-red-600 text-white text-sm font-semibold">Delete</button>
        </div>
      </div>
    </div>
  );
}
