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
    router.push(`/public/properties?${params.toString()}`);
  }

  return (
    <form onSubmit={onSearch} className="w-full flex flex-row gap-2 items-center flex-nowrap overflow-x-auto">
      <input
        aria-label="Postcode or city"
        placeholder="Postcode or city"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="rounded-full border px-2 py-1 w-36 min-w-0"
      />

      <input
        aria-label="Min rent"
        type="number"
        placeholder="Min"
        value={minRent || ""}
        onChange={(e) => setMinRent(Number(e.target.value))}
        className="w-16 rounded-md border px-2 py-1"
      />

      <input
        aria-label="Max rent"
        type="number"
        placeholder="Max"
        value={maxRent || ""}
        onChange={(e) => setMaxRent(Number(e.target.value))}
        className="w-16 rounded-md border px-2 py-1"
      />

      <button className="rounded-full bg-terracotta px-3 py-1 text-white font-semibold hover:opacity-95 w-20 flex-shrink-0" type="submit">Search</button>
    </form>
  );
}
