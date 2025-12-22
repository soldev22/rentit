import { getAllPublicProperties } from '@/lib/property';
import Link from 'next/link';
import PropertyFilters from '@/components/PropertyFilters';

export const metadata = {
  title: 'Available Properties | RentIT',
  description: 'Browse all available rental properties. Share this page with anyone!'
};

export default async function PublicPropertiesPage({ searchParams }: { searchParams?: { city?: string; minRent?: string; maxRent?: string; rooms?: string } }) {
  const filters = {
    city: searchParams?.city,
    minRent: searchParams?.minRent ? Number(searchParams.minRent) : undefined,
    maxRent: searchParams?.maxRent ? Number(searchParams.maxRent) : undefined,
    rooms: searchParams?.rooms ? Number(searchParams.rooms) : undefined,
  };

  const properties = await getAllPublicProperties(filters);

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Available Properties</h1>
        <p className="text-sm text-slate-500">Browse all listed properties. Share this page with anyone interested!</p>
      </header>

      <PropertyFilters />

      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {properties.length === 0 ? (
          <div className="col-span-full text-slate-400">No properties currently listed.</div>
        ) : (
          properties.map((property: any) => (
            <div key={property._id} className="rounded-xl border bg-white shadow p-4 flex flex-col gap-2">
              <div className="font-semibold text-lg">{property.title || property.address?.line1}</div>
              <div className="text-sm text-gray-600">{property.address?.line1}{property.address?.line2 && `, ${property.address.line2}`}, {property.address?.city}, {property.address?.postcode}</div>
              <div className="text-xs text-gray-400">Status: {property.status}</div>
              <Link href={`/public/properties/${property._id}`} className="mt-2 text-indigo-600 hover:underline text-sm font-medium">View Details</Link>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
