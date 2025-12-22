import { getAllPublicProperties } from '@/lib/property';
import HeroSearch from '@/components/HeroSearch';
import PropertyCard from '@/components/PropertyCard';
import FeaturedCarousel from '@/components/FeaturedCarousel';
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
        <h1 className="text-3xl font-bold text-indigo-800">Find your next home</h1>
        <p className="text-lg text-slate-600">Browse available properties from landlords across the UK.</p>
        <div className="mt-6">
          <div className="rounded-xl bg-gradient-to-r from-indigo-50 via-white to-white p-8 shadow-md">
            <h2 className="text-xl font-semibold mb-3">Search properties</h2>
            <HeroSearch />
          </div>
        </div>
      </header>
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Featured properties</h2>
        <FeaturedCarousel items={properties.slice(0, 8)} />
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {properties.map((property: any) => (
            <PropertyCard key={property._id} property={property} />
          ))}
        </div>
      </section>
    </main>
  );
}
