import { getAllPublicProperties } from '@/lib/property';
import Link from 'next/link';
import PropertyFilters from '@/components/PropertyFilters';
import PropertyCard from '@/components/PropertyCard';
import React, { Suspense } from 'react';

export const metadata = {
  title: 'Available Properties | RentIT',
  description: 'Browse all available rental properties. Share this page with anyone!'
};

export default async function PublicPropertiesPage({ searchParams }: { searchParams?: { city?: string; minRent?: string; maxRent?: string; rooms?: string; hasHero?: string } | Promise<{ city?: string; minRent?: string; maxRent?: string; rooms?: string; hasHero?: string }> }) {
  // `searchParams` may be a Promise in some Next.js runtimes; unwrap it safely before use
  const resolvedSearchParams = typeof (searchParams as any)?.then === 'function' ? await (searchParams as any) : searchParams;

  const filters = {
    city: resolvedSearchParams?.city,
    minRent: resolvedSearchParams?.minRent ? Number(resolvedSearchParams.minRent) : undefined,
    maxRent: resolvedSearchParams?.maxRent ? Number(resolvedSearchParams.maxRent) : undefined,
    rooms: resolvedSearchParams?.rooms ? Number(resolvedSearchParams.rooms) : undefined,
    hasHero: resolvedSearchParams?.hasHero === "true",
  };

  const properties = await getAllPublicProperties(filters);

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Available Properties</h1>
        <p className="text-sm text-slate-500">Browse all listed properties. Share this page with anyone interested!</p>
      </header>

      <Suspense fallback={<div className="text-sm text-slate-400">Loading filters…</div>}>
        <PropertyFilters />
      </Suspense>

      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {properties.length === 0 ? (
          <div className="col-span-full text-slate-400">No properties currently listed.</div>
        ) : (
          properties.map((property: any) => (
            <PropertyCard key={property._id} property={property} />
          ))
        )}
      </section>
    </main>
  );
}
