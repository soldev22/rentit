"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface FeaturedCarouselItem {
  _id: string;
  title: string;
  address?: {
    line1?: string;
    city?: string;
    postcode?: string;
  };
 photos: { url: string; isHero?: boolean }[];
}

export default function FeaturedCarousel({ items = [] }: { items: FeaturedCarouselItem[] }) {
  const [index, setIndex] = useState(0);
  const timer = useRef<number | null>(null);

  const slides = items.filter((i) => i.photos && i.photos.length > 0);
  const count = slides.length;

  useEffect(() => {
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, count]);

  function start() {
    stop();
    if (count <= 1) return;
    timer.current = window.setTimeout(() => setIndex((i) => (i + 1) % count), 5000);
  }

  function stop() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  if (count === 0) return null;

  const slide = slides[index % count];

  return (
    <div className="relative rounded-xl overflow-hidden shadow-lg">
      <div
        className="w-full h-64 sm:h-80 md:h-96 bg-gray-900 flex items-center justify-center"
        onMouseEnter={stop}
        onMouseLeave={start}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={(() => {
          const heroPhoto = slide.photos.find(photo => photo.isHero);
          return (heroPhoto || slide.photos[0]).url;
        })()} alt={slide.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute left-6 bottom-6 text-white max-w-xl">
          <h3 className="text-2xl md:text-3xl font-semibold">{slide.title}</h3>
          <p className="mt-1 text-sm md:text-base">{slide.address?.line1}, {slide.address?.city} {slide.address?.postcode}</p>
          <div className="mt-3">
            <Link href={`/public/properties/${slide._id}`} className="inline-block rounded-md bg-clay px-4 py-2 text-sm font-semibold text-white">View property</Link>
          </div>
        </div>
      </div>

      {/* Controls */}
      <button
        aria-label="Previous"
        onClick={() => setIndex((i) => (i - 1 + count) % count)}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/50 rounded-full w-9 h-9 flex items-center justify-center"
      >
        ‹
      </button>
      <button
        aria-label="Next"
        onClick={() => setIndex((i) => (i + 1) % count)}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/50 rounded-full w-9 h-9 flex items-center justify-center"
      >
        ›
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`w-2 h-2 rounded-full ${i === index ? 'bg-white' : 'bg-white/40'}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
