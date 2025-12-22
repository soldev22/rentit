"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PropertyFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [city, setCity] = useState(searchParams.get("city") || "");
  const [minRent, setMinRent] = useState(searchParams.get("minRent") || "");
  const [maxRent, setMaxRent] = useState(searchParams.get("maxRent") || "");
  const [rooms, setRooms] = useState(searchParams.get("rooms") || "");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    // keep local state in sync when navigation happens
    setCity(searchParams.get("city") || "");
    setMinRent(searchParams.get("minRent") || "");
    setMaxRent(searchParams.get("maxRent") || "");
    setRooms(searchParams.get("rooms") || "");
  }, [searchParams]);

  function applyFilters(e?: React.FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (minRent) params.set("minRent", minRent);
    if (maxRent) params.set("maxRent", maxRent);
    if (rooms) params.set("rooms", rooms);
    router.push(`/public/properties?${params.toString()}`);
  }

  function clearFilters() {
    setCity("");
    setMinRent("");
    setMaxRent("");
    setRooms("");
    router.push(`/public/properties`);
  }

  return (
    <div className="mb-4">
      {/* Mobile toggle */}
      <div className="flex items-center justify-between md:hidden mb-2">
        <button className="rounded-md border px-3 py-2" onClick={() => setShowMobileFilters((s) => !s)}>
          {showMobileFilters ? 'Hide filters' : 'Show filters'}
        </button>
        <div className="text-sm text-gray-500">Tip: use filters to narrow results</div>
      </div>

      <form onSubmit={applyFilters} className={`${showMobileFilters ? '' : 'hidden'} md:flex flex-col md:flex-row md:items-center gap-3 md:gap-4 items-center md:flex-nowrap`}>
        <input placeholder="City or postcode" value={city} onChange={(e) => setCity(e.target.value)} className="rounded-md border px-3 py-2 w-full md:w-64" />
        <input placeholder="Min rent" type="number" value={minRent} onChange={(e) => setMinRent(e.target.value)} className="rounded-md border px-3 py-2 w-24 md:w-28" />
        <input placeholder="Max rent" type="number" value={maxRent} onChange={(e) => setMaxRent(e.target.value)} className="rounded-md border px-3 py-2 w-24 md:w-28" />
        <input placeholder="Rooms" type="number" value={rooms} onChange={(e) => setRooms(e.target.value)} className="rounded-md border px-3 py-2 w-20 md:w-20" />
        <div className="ml-auto flex gap-2">
          <button className="rounded-md bg-clay text-white px-3 py-2" type="submit">Apply</button>
          <button type="button" className="rounded-md border px-3 py-2" onClick={clearFilters}>Clear</button>
        </div>
      </form>
    </div>
  );
}
