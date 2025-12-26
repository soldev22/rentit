"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HeroSearch() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [minRent, setMinRent] = useState(0);
  const [maxRent, setMaxRent] = useState(0);
  
    function onSearch(e?: React.FormEvent) {
      e?.preventDefault();
      const params = new URLSearchParams();
      if (location) params.set("city", location);
      if (minRent) params.set("minRent", String(minRent));
      if (maxRent) params.set("maxRent", String(maxRent));
      params.set("hasHero", "true"); // Only show properties with hero images
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
            onChange={(e) => setMinRent(Number(e.target.value || 0))}
            className="w-24 rounded-md border px-2 py-2"
          />

          <input
            aria-label="Max rent"
            type="number"
            placeholder="Max"
            value={maxRent || ""}
            onChange={(e) => setMaxRent(Number(e.target.value || 0))}
            className="w-24 rounded-md border px-2 py-2"
          />

          <button className="rounded-full bg-terracotta px-4 py-2 text-white font-semibold hover:opacity-95" type="submit">Search</button>
        </div>
      </div>
    </form>
  );
}
