import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import Image from 'next/image';
import PropertyGallery from '@/components/PropertyGallery';
import ShareButtons from '@/components/ShareButtons';
import ApplyButton from '@/components/ApplyButton';

export const dynamic = 'force-dynamic';

async function getPropertyById(id: string) {
  const col = await getCollection('properties');
  let p: any | null = null;
  try {
    p = await col.findOne({ _id: new ObjectId(id) });
  } catch (err) {
    // Invalid ObjectId or DB error - surface minimal log and return null so page shows "not found"
    console.error('getPropertyById error (invalid id or DB):', err);
    return null;
  }

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

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = (typeof (params as any)?.then === 'function') ? await (params as any) : (params as any);
  const property = await getPropertyById(id);
  if (!property) return <div className="p-6">Property not found</div>;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <PropertyGallery photos={property.photos} />

          <div className="mt-4">
            <h1 className="text-3xl font-bold mb-1">{property.title}</h1>
            <div className="text-sm text-gray-600 mb-3">{property.address?.line1}{property.address?.line2 && `, ${property.address.line2}`}, {property.address?.city} {property.address?.postcode}</div>

            <div className="prose max-w-none">
              <p>{property.description}</p>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500">Listed:</div>
                <div className="text-sm font-medium">{property.createdAt ? new Date(property.createdAt).toLocaleDateString('en-GB') : ''}</div>
              </div>

              <ShareButtons title={property.title} />
            </div>
          </div>
        </div>

        <aside className="border rounded-md p-6 h-fit">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-sm text-gray-500">Rent</div>
              <div className="text-2xl font-bold">£{property.rentPcm} <span className="text-sm font-medium">pcm</span></div>
            </div>
            <div>
              <span className={`inline-block rounded px-3 py-1 text-xs font-semibold ${property.status === 'listed' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                {property.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="mt-6">
            {/* Client-side apply button handles auth and registers interest via API */}
            <ApplyButton propertyId={property._id} propertyTitle={property.title} />
          </div>

          <div className="mt-6 text-sm text-gray-700 space-y-1">
            {property.rooms && <div><span className="font-semibold">Rooms:</span> {property.rooms}</div>}
            {property.address?.line1 && <div><span className="font-semibold">Address:</span> <div className="text-sm text-gray-600">{property.address.line1}{property.address.line2 && `, ${property.address.line2}`}</div></div>}
            {property.address?.city && <div><span className="font-semibold">City:</span> {property.address.city}</div>}
            {property.address?.postcode && <div><span className="font-semibold">Postcode:</span> {property.address.postcode}</div>}
            {property.address?.country && <div><span className="font-semibold">Country:</span> {property.address.country}</div>}
          </div>
        </aside>
      </div>
    </main>
  );
}
