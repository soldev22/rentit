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
    <form onSubmit={onSearch} className="w-full max-w-3xl mx-auto flex flex-col sm:flex-row gap-3">
      <input
        aria-label="Location"
        placeholder="City or postcode"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="flex-1 rounded-md border px-4 py-3"
      />
      <input
        aria-label="Min rent"
        type="number"
        placeholder="Min rent"
        value={minRent || ""}
        onChange={(e) => setMinRent(Number(e.target.value))}
        className="w-28 rounded-md border px-3 py-3"
      />
      <input
        aria-label="Max rent"
        type="number"
        placeholder="Max rent"
        value={maxRent || ""}
        onChange={(e) => setMaxRent(Number(e.target.value))}
        className="w-28 rounded-md border px-3 py-3"
      />
      <button className="rounded-md bg-[#6b4eff] px-5 py-3 text-white font-semibold hover:bg-[#5533ff]" type="submit">Browse</button>
    </form>
  );
}
