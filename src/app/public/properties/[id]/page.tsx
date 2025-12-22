import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

async function getPropertyById(id: string) {
  const col = await getCollection('properties');
  const p = await col.findOne({ _id: new ObjectId(id) });
  if (!p) return null;
  return {
    _id: p._id.toString(),
    title: p.title,
    description: p.description,
    address: p.address,
    rentPcm: p.rentPcm,
    rooms: p.rooms,
    status: p.status,
    photos: p.photos || [],
    createdAt: p.createdAt,
  };
}

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const property = await getPropertyById(params.id);
  if (!property) return <div className="p-6">Property not found</div>;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {property.photos && property.photos.length > 0 ? (
            <div className="rounded-md overflow-hidden mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={property.photos[0].url} alt={property.title} className="w-full h-80 object-cover" />
            </div>
          ) : (
            <div className="rounded-md bg-gray-100 h-80 mb-4 flex items-center justify-center">No photos</div>
          )}

          <h1 className="text-2xl font-bold mb-2">{property.title}</h1>
          <div className="text-sm text-gray-600 mb-4">{property.address?.line1}, {property.address?.city} {property.address?.postcode}</div>

          <div className="prose max-w-none">
            <p>{property.description}</p>
          </div>
        </div>

        <aside className="md:col-span-1 border rounded-md p-4 h-fit">
          <div className="text-sm text-gray-700">Rent</div>
          <div className="text-xl font-semibold mb-4">£{property.rentPcm} pcm</div>

          <div className="text-sm text-gray-700">Status</div>
          <div className="mb-4"><span className="inline-block rounded bg-green-600 px-2 py-1 text-white text-xs">{property.status}</span></div>

          <div className="mt-6">
            <a href="#apply" className="w-full inline-block rounded-md bg-indigo-600 px-4 py-2 text-white text-center">Apply for this property</a>
          </div>

          <div className="mt-6 text-xs text-gray-500">Listed: {property.createdAt ? new Date(property.createdAt).toLocaleDateString('en-GB') : ''}</div>
        </aside>
      </div>
    </main>
  );
}
