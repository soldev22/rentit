import Link from "next/link";
import ApplyButton from "./ApplyButton";
import { formatPropertyLabel } from "@/lib/formatPropertyLabel";

interface PropertyPhoto {
  url: string;
  isHero?: boolean;
}

interface PropertyAddress {
  line1?: string;
  line2?: string; // Added line2 for the full address
  city?: string;
  postcode?: string; // Added postcode for the full address
}

interface Property {
  _id: string;
  title: string;
  rentPcm: number;
  photos?: PropertyPhoto[];
  address?: PropertyAddress;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm?: number;
  furnished?: string;
  status: string;
}

export default function PropertyCard({
  property,
  isApplied,
}: {
  property: Property;
  isApplied?: boolean;
}) {
  return (
    <article
      data-testid={`property-card-${property._id}`}
      className={`rounded-xl border p-4 shadow-sm hover:shadow-md ${
        isApplied ? 'bg-green-50 border-green-200' : 'bg-warm'
      }`}
    >
      {isApplied && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-green-600 px-2 py-1 text-xs font-semibold text-white">
          Arranging viewing
        </div>
      )}
      <Link
        href={`/public/properties/${property._id}`}
        className="block"
        aria-label={`View property ${formatPropertyLabel(property)}`}
      >
        <div className="w-full aspect-[4/3] rounded-md overflow-hidden mb-3 bg-gray-100 relative">
          {property.photos && property.photos.length > 0 ? (
            (() => {
              const heroPhoto = property.photos.find((photo: PropertyPhoto) => photo.isHero);
              const displayPhoto = heroPhoto || property.photos[0];
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayPhoto.url} alt={property.title} className="w-full h-full object-cover" />
              );
            })()
          ) : (
            <div className="text-sm text-gray-400 h-full flex items-center justify-center">No image</div>
          )}

          {/* Price overlay */}
          <div className="absolute left-3 top-3 bg-black bg-opacity-60 text-white px-3 py-1 rounded-md text-sm">£{property.rentPcm}/pcm</div>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-heading truncate text-text-dark" data-testid="property-title">{property.title}</h3>
          <div className="text-sm text-text-dark font-semibold" data-testid="property-price">£{property.rentPcm}</div>
        </div>

        <div className="text-sm text-gray-700">
          {property.address?.line1}
          {property.address?.line2 && `, ${property.address.line2}`}
          {property.address?.city && `, ${property.address.city}`}
          {property.address?.postcode && `, ${property.address.postcode}`}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            {property.bedrooms !== undefined && <div data-testid="prop-bedrooms">🛏 {property.bedrooms}</div>}
            {property.bathrooms !== undefined && <div data-testid="prop-bathrooms">🛁 {property.bathrooms}</div>}
            {property.sizeSqm !== undefined && <div data-testid="prop-size">📐 {property.sizeSqm} sqm</div>}
            {property.furnished && property.furnished !== 'unknown' && <div data-testid="prop-furnished">{property.furnished}</div>}
          </div>

          <div>
            <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold text-white ${property.status === 'listed' ? 'bg-green-600' : 'bg-gray-500'}`} data-testid="prop-status">
              {property.status}
            </span>
          </div>
        </div>
      </Link>

      {/* Apply button - only show for listed properties */}
      {property.status === 'listed' && !isApplied && (
        <div className="mt-4">
          <ApplyButton 
            propertyId={property._id} 
            propertyTitle={formatPropertyLabel(property)}
          />
        </div>
      )}
    </article>
  );
}
