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
    <form onSubmit={onSearch} className="w-full flex flex-col sm:flex-row gap-3">
      <input
        aria-label="Location"
        placeholder="City or postcode"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="flex-1 rounded-full border px-4 py-2"
      />
      <div className="flex flex-col sm:flex-row gap-2 items-stretch w-full sm:w-auto">
        <input
          aria-label="Min rent"
          type="number"
          placeholder="Min rent"
          value={minRent || ""}
          onChange={(e) => setMinRent(Number(e.target.value))}
          className="w-full sm:w-24 rounded-md border px-2 py-2"
        />
        <input
          aria-label="Max rent"
          type="number"
          placeholder="Max rent"
          value={maxRent || ""}
          onChange={(e) => setMaxRent(Number(e.target.value))}
          className="w-full sm:w-24 rounded-md border px-2 py-2"
        />
      </div>

      <button className="rounded-full bg-terracotta px-5 py-2 text-white font-semibold hover:opacity-95 w-full sm:w-auto mt-2 sm:mt-0" type="submit">Browse</button>
    </form>
  );
}
