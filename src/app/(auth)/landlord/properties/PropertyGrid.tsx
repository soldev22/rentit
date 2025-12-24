"use client";

import { useState } from "react";
import { formatDateShort } from '../../../../lib/formatDate';
import EditPropertyModal from "../../landlord/properties/EditPropertyModal";
function getPageNumbers(current: number, total: number) {
  const pages: (number | "…")[] = [];

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  pages.push(1);

  if (current > 4) pages.push("…");

  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 3) pages.push("…");

  pages.push(total);

  return pages;
}

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
  photos?: { url: string; blobName: string }[];
};

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    draft: "bg-gray-400",
    listed: "bg-green-600",
    paused: "bg-amber-500",
    let: "bg-blue-600",
    breached: "bg-red-600",
  };

  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase text-white ${
        colours[status] ?? "bg-gray-500"
      }`}
    >
      {status}
    </span>
  );
}

export default function PropertyGrid({
  properties,
  page = 1,
  totalPages = 1,
}: {
  properties: Property[];
  page?: number;
  totalPages?: number;
}) {
  const [selected, setSelected] = useState<Property | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);

  return (
    <>
      {/* Responsive Grid - true fill */}
      <div
        className="w-full grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      >
        {properties.map((property) => (
          <div
            key={property._id}
            onClick={() => setSelected(property)}
            className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md w-[600px]"
          >
            {property.photos && property.photos.length > 0 && (
              <img
                src={property.photos[0].url}
                alt="Property thumbnail"
                className="w-20 h-20 object-cover rounded-md mb-2 border border-gray-300"
              />
            )}
            <h3 className="text-base font-semibold leading-tight truncate" title={property.title}>
              {property.title}
            </h3>
            <p className="mt-1 text-sm font-medium text-gray-800 truncate" title={property.address?.line1}>
              {property.address?.line1}
            </p>
            <p className="text-xs text-gray-500 truncate" title={`${property.address?.city} ${property.address?.postcode}`}>
              {property.address?.city} {property.address?.postcode}
            </p>
            <p className="mt-2 text-sm">
              Rent: <strong>£{property.rentPcm} pcm</strong>
            </p>
            <div className="mt-2">
              <StatusBadge status={property.status} />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Created {formatDateShort(property.createdAt)}
            </p>
          </div>
        ))}
      </div>

      {/* Pagination controls */}
     {totalPages > 1 && (
  <div className="mt-6 flex items-center justify-center gap-1 text-sm">
    {/* Previous */}
    <a
      href={`/landlord/properties?page=${page - 1}`}
      className={`px-3 py-1 rounded ${
        page === 1
          ? "pointer-events-none text-gray-400"
          : "text-[#6b4eff] hover:bg-gray-100"
      }`}
    >
      Prev
    </a>

    {/* Page numbers */}
    {getPageNumbers(page, totalPages).map((p) =>
      p === "…" ? (
        <span key={Math.random()} className="px-2 text-gray-400">
          …
        </span>
      ) : (
        <a
          key={p}
          href={`/landlord/properties?page=${p}`}
          className={`px-3 py-1 rounded ${
            p === page
              ? "bg-[#6b4eff] text-white font-semibold"
              : "hover:bg-gray-100 text-gray-700"
          }`}
        >
          {p}
        </a>
      )
    )}

    {/* Next */}
    <a
      href={`/landlord/properties?page=${page + 1}`}
      className={`px-3 py-1 rounded ${
        page === totalPages
          ? "pointer-events-none text-gray-400"
          : "text-[#6b4eff] hover:bg-gray-100"
      }`}
    >
      Next
    </a>
  </div>
)}


      {/* Edit modal */}
      {selected && (
        <EditPropertyModal
          property={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
