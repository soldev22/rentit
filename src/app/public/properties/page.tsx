import { getAllPublicProperties } from '@/lib/property';
import PropertyCard from '@/components/PropertyCard';
import React from 'react';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCollection } from '@/lib/db';

// --- PAGE SERVER COMPONENT ---
export const metadata = {
  title: 'Available Properties | Rentsimple',
  description: 'Browse all available rental properties. Share this page with anyone!'
};

export const dynamic = 'force-dynamic';

import FilterBar from "./FilterBar"; // Import directly (FilterBar must be a client component)

export default async function PublicPropertiesPage({ searchParams }: { searchParams?: { city?: string; minRent?: string; maxRent?: string; rooms?: string; hasHero?: string } | Promise<{ city?: string; minRent?: string; maxRent?: string; rooms?: string; hasHero?: string }> }) {
  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // `searchParams` may be a Promise in some Next.js runtimes; unwrap it safely before use
  function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
    return typeof (value as Promise<T>)?.then === 'function';
  }
  const resolvedSearchParams =
    isPromise(searchParams) ? await searchParams : searchParams;

  const filters = {
    city: resolvedSearchParams?.city,
    minRent: resolvedSearchParams?.minRent ? Number(resolvedSearchParams.minRent) : undefined,
    maxRent: resolvedSearchParams?.maxRent ? Number(resolvedSearchParams.maxRent) : undefined,
    rooms: resolvedSearchParams?.rooms ? Number(resolvedSearchParams.rooms) : undefined,
    hasHero: resolvedSearchParams?.hasHero === "true",
  };

  const properties = await getAllPublicProperties(filters);

  // If an applicant is logged in, mark properties with an active application.
  const appliedPropertyIds = new Set<string>();
  const session = await getServerSession(authOptions);

  if (
    session?.user?.role === 'APPLICANT' &&
    (ObjectId.isValid(session.user.id) || Boolean(session.user.email))
  ) {
    const applications = await getCollection('tenancy_applications');

    const rawEmail = session.user.email ? String(session.user.email).trim() : null;
    const emailRegex = rawEmail ? new RegExp(`^${escapeRegex(rawEmail)}$`, 'i') : null;

    // Be tolerant of legacy records where IDs may have been stored as strings.
    const applicantClauses: Record<string, unknown>[] = [];
    if (ObjectId.isValid(session.user.id)) {
      applicantClauses.push({ applicantId: new ObjectId(session.user.id) });
      applicantClauses.push({ applicantId: session.user.id });
    }
    if (emailRegex) {
      applicantClauses.push({ applicantEmail: emailRegex });
      applicantClauses.push({ 'coTenant.email': emailRegex });
    }

    const activeApps = await applications
      .find(
        {
          ...(applicantClauses.length ? { $or: applicantClauses } : {}),
          status: { $in: ['draft', 'in_progress'] },
        },
        { projection: { propertyId: 1 } }
      )
      .toArray();

    for (const app of activeApps) {
      const pid = (app as { propertyId?: ObjectId | string })?.propertyId;
      if (pid instanceof ObjectId) appliedPropertyIds.add(pid.toString());
      else if (typeof pid === 'string' && pid) appliedPropertyIds.add(pid);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Available Properties</h1>
        <p className="text-sm text-slate-500">Browse all listed properties. Share this page with anyone interested!</p>
      </header>

      <FilterBar />

      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {properties.length === 0 ? (
          <div className="col-span-full text-slate-400">No properties currently listed.</div>
        ) : (
          properties
            .filter(
              (property: {
                _id: string;
                title: string;
                rentPcm: number;
                status: string;
                [key: string]: unknown;
              }) =>
                property &&
                typeof property.title === 'string' &&
                typeof property.rentPcm !== 'undefined' &&
                typeof property.status === 'string'
            )
            .map((property: {
              _id: string;
              title: string;
              rentPcm: number;
              status: string;
              [key: string]: unknown;
            }) => (
              <PropertyCard
                key={property._id}
                property={property}
                isApplied={appliedPropertyIds.has(property._id)}
              />
            ))
        )}
      </section>
    </main>
  );
}
