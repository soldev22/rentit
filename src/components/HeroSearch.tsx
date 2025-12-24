"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function HeroSearch() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [minRent, setMinRent] = useState(0);
  const [maxRent, setMaxRent] = useState(0);

  // Slider bounds
    const SLIDER_MIN = 0;
    const SLIDER_MAX = 5000;
    const SLIDER_STEP = 50;
  
    const fillRef = useRef<HTMLDivElement | null>(null);
  
    useEffect(() => {
      if (!fillRef.current) return;
      const left = `${(minRent / SLIDER_MAX) * 100}%`;
      const right = `${100 - (maxRent / SLIDER_MAX) * 100}%`;
      fillRef.current.style.left = left;
      fillRef.current.style.right = right;
    }, [minRent, maxRent]);
  
    function onSearch(e?: React.FormEvent) {
      e?.preventDefault();
      const params = new URLSearchParams();
      if (location) params.set("city", location);
      if (minRent) params.set("minRent", String(minRent));
      if (maxRent) params.set("maxRent", String(maxRent));
      router.push(`/public/properties?${params.toString()}`);
    }

  return (
    <form onSubmit={onSearch} className="w-full">
      <div className="flex flex-col md:flex-row md:items-center md:gap-3">
        <input
          aria-label="Postcode or city"
          placeholder="Postcode or city"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="rounded-full border px-3 py-2 w-full md:flex-1 md:w-auto"
        />

        <div className="mt-2 md:mt-0 flex items-center gap-2">
          <input
            aria-label="Min rent"
            type="number"
            placeholder="Min"
            value={minRent || ""}
            onChange={(e) => {
              const v = Number(e.target.value || 0);
              setMinRent(Math.max(SLIDER_MIN, Math.min(v, maxRent || SLIDER_MAX)));
            }}
            className="w-24 rounded-md border px-2 py-2"
          />

          <input
            aria-label="Max rent"
            type="number"
            placeholder="Max"
            value={maxRent || ""}
            onChange={(e) => {
              const v = Number(e.target.value || 0);
              setMaxRent(Math.min(SLIDER_MAX, Math.max(v, minRent || SLIDER_MIN)));
            }}
            className="w-24 rounded-md border px-2 py-2"
          />

          <button className="rounded-full bg-terracotta px-4 py-2 text-white font-semibold hover:opacity-95" type="submit">Search</button>
        </div>
      </div>

      {/* Dual range slider (two overlapping inputs) */}
      <div className="relative h-6 mt-3">
        {/* lower thumb */}
          <input
            type="range"
            aria-label="Minimum rent"
            title="Minimum rent"
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step={SLIDER_STEP}
            value={minRent}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v <= maxRent) setMinRent(v);
            }}
            className="w-full appearance-none h-6 bg-transparent pointer-events-auto"
          />
          {/* upper thumb */}
          <input
            type="range"
            aria-label="Maximum rent"
            title="Maximum rent"
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step={SLIDER_STEP}
            value={maxRent}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= minRent) setMaxRent(v);
            }}
            className="w-full appearance-none h-6 bg-transparent pointer-events-auto absolute top-0 left-0"
          />
        {/* Visual track */}
        <div className="absolute inset-0 flex items-center pointer-events-none">
          <div className="h-1 w-full bg-gray-200 rounded-full" />
          <div ref={fillRef} className="absolute h-1 bg-clay rounded-full" />
        </div>
      </div>
    </form>
  );
}
