import { getAllPublicProperties } from '@/lib/property';
import HeroSearch from '@/components/HeroSearch';
import PropertyCard from '@/components/PropertyCard';
import FeaturedCarousel from '@/components/FeaturedCarousel';
import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Rentsimple | Find Your Next Home',
  description: 'Browse all available rental properties from any landlord. Start your rental journey here!'
};

export default async function HomePage() {
  const properties = await getAllPublicProperties();

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-8 space-y-8">
      {properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Image
            src="/uploads/advert-submit-property.png"
            alt="Advert: Submit your property for listing"
            width={800}
            height={800}
            className="rounded-xl shadow-lg mb-6"
            priority
          />
          <h3 className="text-2xl font-bold text-indigo-700 mb-2">List your property with Rentsimple!</h3>
          <p className="text-lg text-slate-600 mb-4">No properties found. Be the first to reach thousands of renters—submit your property today.</p>
          <Link
            href="/register"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Register to list a property
          </Link>
        </div>
      ) : (
        <>
          <header className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-indigo-800">Find your next home</h1>
            <p className="text-lg text-slate-600">Browse available properties from landlords across the UK.</p>
            <div className="mt-6 flex justify-center">
              <div className="mx-auto w-full max-w-md sm:max-w-3xl rounded-xl bg-gradient-to-r from-indigo-50 via-white to-white p-6 sm:p-8 shadow-md">
                <h2 className="text-xl font-semibold mb-3">Search properties</h2>
                <HeroSearch />
              </div>
            </div>
          </header>
          <section className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Featured properties</h2>
            <FeaturedCarousel items={properties.slice(0, 8)} />
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {properties.map(property => (
                <div key={property._id} className="border rounded-lg overflow-hidden shadow-md">
                  <PropertyCard property={property} />
                  <div className="p-4">
                    <div className="text-sm text-gray-700">
                      {[property.address?.line1, property.address?.line2, property.address?.city, property.address?.postcode]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
