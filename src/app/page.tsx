import { getAllPublicProperties } from '@/lib/property';
import Link from 'next/link';

export const metadata = {
  title: 'RentIT | Find Your Next Home',
  description: 'Browse all available rental properties from any landlord. Start your rental journey here!'
};

export default async function HomePage() {
  const properties = await getAllPublicProperties();

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-8 space-y-8">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-indigo-800">Welcome to RentIT</h1>
        <p className="text-lg text-slate-600">Find your next home from our list of available properties.</p>
      </header>
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {properties.length === 0 ? (
          <div className="col-span-full text-slate-400 text-center">No properties currently listed.</div>
        ) : (
          properties.map((property: any) => (
            <div key={property._id} className="rounded-xl border bg-white shadow p-5 flex flex-col gap-2">
              <div className="font-semibold text-xl text-indigo-900">{property.title || property.address?.line1}</div>
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
