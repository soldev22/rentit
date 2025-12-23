import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
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
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    furnished: p.furnished,
    deposit: p.deposit,
    tenancyLengthMonths: p.tenancyLengthMonths,
    billsIncluded: p.billsIncluded || [],
    petsAllowed: p.petsAllowed,
    smokingAllowed: p.smokingAllowed,
    epcRating: p.epcRating,
    councilTaxBand: p.councilTaxBand,
    sizeSqm: p.sizeSqm,
    parking: p.parking,
    amenities: p.amenities || [],
    virtualTourUrl: p.virtualTourUrl,
    floor: p.floor,
    hmoLicenseRequired: p.hmoLicenseRequired,
    viewingInstructions: p.viewingInstructions,
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

        <aside className="border rounded-md p-6 h-fit" aria-labelledby="property-sidebar">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-sm text-gray-500">Rent</div>
              <div className="text-2xl font-bold" data-testid="prop-price">£{property.rentPcm} <span className="text-sm font-medium">pcm</span></div>
            </div>
            <div>
              <span className={`inline-block rounded px-3 py-1 text-xs font-semibold ${property.status === 'listed' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`} data-testid="prop-status-badge">
                {property.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="mt-6">
            {/* Client-side apply button handles auth and registers interest via API */}
            <ApplyButton propertyId={property._id} propertyTitle={property.title} />
          </div>

          <div className="mt-6 text-sm text-gray-700 space-y-2" id="property-sidebar">
            {property.rooms && <div><span className="font-semibold">Rooms:</span> {property.rooms}</div>}
            {property.bedrooms !== undefined && <div data-testid="prop-detail-bedrooms"><span className="font-semibold">Bedrooms:</span> {property.bedrooms}</div>}
            {property.bathrooms !== undefined && <div data-testid="prop-detail-bathrooms"><span className="font-semibold">Bathrooms:</span> {property.bathrooms}</div>}
            {property.furnished && property.furnished !== 'unknown' && <div data-testid="prop-detail-furnished"><span className="font-semibold">Furnished:</span> {property.furnished}</div>}
            {property.sizeSqm !== undefined && <div data-testid="prop-detail-size"><span className="font-semibold">Size:</span> {property.sizeSqm} sqm</div>}
            {property.deposit !== undefined && <div data-testid="prop-detail-deposit"><span className="font-semibold">Deposit:</span> £{property.deposit}</div>}
            {property.tenancyLengthMonths !== undefined && <div data-testid="prop-detail-tenancy"><span className="font-semibold">Tenancy:</span> {property.tenancyLengthMonths} months</div>}
            {property.billsIncluded && property.billsIncluded.length > 0 && <div data-testid="prop-detail-bills"><span className="font-semibold">Bills:</span> {property.billsIncluded.join(', ')}</div>}
            {property.amenities && property.amenities.length > 0 && <div data-testid="prop-detail-amenities"><span className="font-semibold">Amenities:</span> <ul className="list-disc list-inside">{property.amenities.map((a:string)=> <li key={a} className="capitalize">{a.replace('_',' ')}</li>)}</ul></div>}
            {property.virtualTourUrl && <div data-testid="prop-detail-virtual"><a href={property.virtualTourUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">Virtual tour</a></div>}
            {property.viewingInstructions && <div data-testid="prop-detail-viewing"><span className="font-semibold">Viewing:</span> <div className="text-sm text-gray-600">{property.viewingInstructions}</div></div>}
          </div>
        </aside>
      </div>
    </main>
  );
}
