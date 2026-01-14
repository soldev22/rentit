import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import PropertyEditForm from './PropertyEditForm';

export const dynamic = 'force-dynamic';

interface RawProperty {
  _id: ObjectId;
  title?: string;
  status?: string;
  rentPcm?: number;
  description?: string;
  deposit?: number;
  amenities?: string[];
  virtualTourUrl?: string;
  viewingInstructions?: string;
  address?: {
    line1?: string;
    city?: string;
    postcode?: string;
  };
  photos?: Array<{ url: string; blobName: string; isHero?: boolean }>;
  furnished?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm?: number;
  tenancyLengthMonths?: number;
  billsIncluded?: string[];
  petsAllowed?: boolean;
  smokingAllowed?: boolean;
  epcRating?: string;
  councilTaxBand?: string;
  parking?: string;
  floor?: string;
  hmoLicenseRequired?: boolean;
}

async function getPropertyById(id: string) {
  const col = await getCollection('properties');
  let p: RawProperty | null = null;
  try {
    p = await col.findOne({ _id: new ObjectId(id) });
  } catch (err) {
    console.error('getPropertyById error (invalid id or DB):', err);
  }
  return p;
}

export default async function PropertyEditPage({
  params,
}: {
  params: { propertyId: string };
}) {
  const property = await getPropertyById(params.propertyId);

  if (!property) {
    redirect('/landlord/properties');
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="mb-6">Edit Property</h1>
      <PropertyEditForm
        property={{
          _id: property._id.toString(),
          title: property.title || '',
          status: property.status || 'draft',
          rentPcm: property.rentPcm || 0,
          description: property.description,
          deposit: property.deposit,
          amenities: property.amenities,
          virtualTourUrl: property.virtualTourUrl,
          viewingInstructions: property.viewingInstructions,
          address: property.address || {},
          photos: property.photos,
        }}
        onClose={() => {}}
      />
    </div>
  );
}