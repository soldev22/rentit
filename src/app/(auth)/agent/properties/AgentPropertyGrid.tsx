"use client";

type Property = {
  _id: string;
  title: string;
  status: string;
  rentPcm: number;
  address: {
    line1?: string;
    city?: string;
    postcode?: string;
  };
  createdAt: string;
};

function getPageNumbers(current: number, total: number) {
  const pages: (number | "…")[] = [];

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  pages.push(1);
  if (current > 4) pages.push("…");

  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 3) pages.push("…");
  pages.push(total);

  return pages;
}

export default function AgentPropertyGrid({
  properties,
  page,
  totalPages,
  query,
}: {
  properties: Property[];
  page: number;
  totalPages: number;
  query: string;
}) {
  return (
    <>
      {/* Search */}
      <form className="mb-4">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by address, city, or postcode"
          className="w-full max-w-md rounded-md border px-3 py-2"
        />
      </form>

      {/* Empty state */}
      {properties.length === 0 && (
        <p className="text-sm text-gray-600">
          No properties available. You may not be assigned to any landlords yet.
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {properties.map((p) => (
          <a
            key={p._id}
            href={`/agent/properties/${p._id}`}
            className="rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition"
          >
            <h3 className="font-semibold text-sm">
              {p.title}
            </h3>

            <p className="mt-1 text-sm text-gray-800">
              {p.address?.line1}
            </p>

            <p className="text-xs text-gray-500">
              {p.address?.city} {p.address?.postcode}
            </p>

            <p className="mt-2 text-sm">
              £{p.rentPcm} pcm
            </p>

            <p className="mt-1 text-xs text-gray-500">
              {p.status.toUpperCase()}
            </p>
          </a>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-1 text-sm">
          {getPageNumbers(page, totalPages).map((p, index) =>
            p === "…" ? (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                …
              </span>
            ) : (
              <a
                key={p}
                href={`/agent/properties?page=${p}&q=${query}`}
                className={`px-3 py-1 rounded ${
                  p === page
                    ? "bg-[#6b4eff] text-white font-semibold"
                    : "hover:bg-gray-100"
                }`}
              >
                {p}
              </a>
            )
          )}
        </div>
      )}
    </>
  );
}
