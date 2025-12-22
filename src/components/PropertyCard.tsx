import Link from "next/link";

export default function PropertyCard({ property }: { property: any }) {
  return (
    <div className="rounded-xl border bg-warm p-4 shadow-sm hover:shadow-md">
      <Link href={`/public/properties/${property._id}`} className="block">
        <div className="w-full aspect-[4/3] rounded-md overflow-hidden mb-3 bg-gray-100">
          {property.photos && property.photos.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={property.photos[0].url} alt={property.title} className="w-full h-full object-cover" />
          ) : (
            <div className="text-sm text-gray-400 h-full flex items-center justify-center">No image</div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-heading truncate text-text-dark">{property.title}</h3>
          <div className="text-sm text-text-dark">£{property.rentPcm}/pcm</div>
        </div>
        <p className="text-sm text-text-dark mt-1 truncate">{property.address?.line1}, {property.address?.city}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold text-white ${property.status === 'listed' ? 'bg-green-600' : 'bg-gray-500'}`}>
            {property.status}
          </span>
        </div>
      </Link>
    </div>
  );
}
