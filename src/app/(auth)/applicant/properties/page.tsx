import { getListedProperties } from "@/lib/property";
import Link from "next/link";

export default async function ApplicantPropertiesPage() {
  const properties = await getListedProperties();

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6 space-y-6">
      <h1 className="text-xl font-semibold mb-4">Available Properties</h1>
      {properties.length === 0 ? (
        <p className="text-slate-400">No properties are currently listed.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {properties.map((p) => (
            <Link
              key={p.id}
              href={`/applicant/properties/${p.id}`}
              className="block rounded-xl border border-slate-300 bg-white shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden group"
            >
              {/* Property photo (if available) */}
              {p.photos && p.photos.length > 0 ? (
                <img
                  src={p.photos[0].url}
                  alt={p.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-48 bg-slate-200 flex items-center justify-center text-slate-400">
                  No photo
                </div>
              )}
              <div className="p-4">
                <h2 className="text-lg font-bold mb-1 text-indigo-700 group-hover:underline">{p.title}</h2>
                <div className="text-slate-600 mb-1">{p.address.line1}, {p.address.city}, {p.address.postcode}</div>
                <div className="text-slate-800 font-semibold mb-2">£{p.rentPcm} pcm</div>
                <div className="text-slate-500 text-sm mb-2 line-clamp-2">{p.description}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
