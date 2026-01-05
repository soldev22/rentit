"use client";

import { useMemo, useState } from "react";

type GalleryPhoto = {
  url: string;
  isHero?: boolean;
};

export default function PropertyGallery({
  photos,
}: {
  photos: GalleryPhoto[];
}) {
  // Ensure hero image is first
  const orderedPhotos = useMemo(() => {
    if (!photos || photos.length === 0) return [];
    return [...photos].sort((a, b) => {
      if (a.isHero) return -1;
      if (b.isHero) return 1;
      return 0;
    });
  }, [photos]);

  const [index, setIndex] = useState(0);

  if (!orderedPhotos || orderedPhotos.length === 0) {
    return (
      <div className="rounded-md bg-gray-100 h-48 sm:h-80 mb-4 flex items-center justify-center">
        No photos
      </div>
    );
  }

  const main = orderedPhotos[index];

  return (
    <div>
      <div className="rounded-md overflow-hidden mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={main.url}
          alt={`Photo ${index + 1}`}
          className="w-full h-48 sm:h-96 object-cover rounded-md transition-all duration-200 max-h-[60vw]"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {orderedPhotos.map((p, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`rounded-md overflow-hidden border-2 min-w-[64px] min-h-[48px] ${
              i === index ? "border-indigo-500" : "border-transparent"
            }`}
            aria-label={`Open photo ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              className="w-16 h-12 object-cover max-w-full max-h-full"
              alt={`Thumb ${i + 1}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// No changes needed here for address display.
// PropertyGallery is for images only.
// To show the full address, update your property grid/card component as previously described.
