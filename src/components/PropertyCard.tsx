import Link from "next/link";

export default function PropertyCard({ property }: { property: any }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md">
      <Link href={`/public/properties/${property._id}`} className="block">
        <div className="w-full h-40 bg-gray-100 rounded-md overflow-hidden mb-3 flex items-center justify-center">
          {property.photos && property.photos.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={property.photos[0].url} alt={property.title} className="w-full h-full object-cover" />
          ) : (
            <div className="text-sm text-gray-400">No image</div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold truncate">{property.title}</h3>
          <div className="text-sm text-gray-500">£{property.rentPcm}/pcm</div>
        </div>
        <p className="text-sm text-gray-600 mt-1 truncate">{property.address?.line1}, {property.address?.city}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold text-white ${property.status === 'listed' ? 'bg-green-600' : 'bg-gray-500'}`}>
            {property.status}
          </span>
        </div>
      </Link>
    </div>
  );
}
