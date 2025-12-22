"use client";

import { useState } from "react";

export default function PropertyGallery({ photos }: { photos: Array<{ url: string }>; }) {
  const [index, setIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <div className="rounded-md bg-gray-100 h-80 mb-4 flex items-center justify-center">No photos</div>
    );
  }

  const main = photos[index];

  return (
    <div>
      <div className="rounded-md overflow-hidden mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={main.url} alt={`Photo ${index + 1}`} className="w-full h-96 object-cover rounded-md" />
      </div>
      <div className="flex items-center gap-2 overflow-x-auto">
        {photos.map((p, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`rounded-md overflow-hidden border-2 ${i === index ? 'border-indigo-500' : 'border-transparent'}`}
            aria-label={`Open photo ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} className="w-20 h-14 object-cover" alt={`Thumb ${i + 1}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
