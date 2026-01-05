"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [city, setCity] = useState(searchParams.get("city") || "");
  const [minRent, setMinRent] = useState(searchParams.get("minRent") || "");
  const [maxRent, setMaxRent] = useState(searchParams.get("maxRent") || "");
  const [rooms, setRooms] = useState(searchParams.get("rooms") || "");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (minRent) params.set("minRent", minRent);
    if (maxRent) params.set("maxRent", maxRent);
    if (rooms) params.set("rooms", rooms);
    router.push(`/public/properties?${params.toString()}`);
  }

  function handleClear() {
    setCity("");
    setMinRent("");
    setMaxRent("");
    setRooms("");
    router.push("/public/properties");
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-wrap gap-2 items-end mb-4">
      <input
        type="text"
        placeholder="City or postcode"
        value={city}
        onChange={e => setCity(e.target.value)}
        className="border rounded px-3 py-2 w-36"
      />
      <input
        type="number"
        placeholder="Min rent"
        value={minRent}
        onChange={e => setMinRent(e.target.value)}
        className="border rounded px-3 py-2 w-28"
      />
      <input
        type="number"
        placeholder="Max rent"
        value={maxRent}
        onChange={e => setMaxRent(e.target.value)}
        className="border rounded px-3 py-2 w-28"
      />
      <input
        type="number"
        placeholder="Rooms"
        value={rooms}
        onChange={e => setRooms(e.target.value)}
        className="border rounded px-3 py-2 w-20"
      />
      <button
        type="submit"
        className="bg-indigo-600 text-white px-4 py-2 rounded font-semibold hover:bg-indigo-700 transition"
      >
        Search
      </button>
      <button
        type="button"
        onClick={handleClear}
        className="border px-4 py-2 rounded font-semibold"
      >
        Clear
      </button>
    </form>
  );
}
