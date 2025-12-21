

import { getCollection } from "@/lib/db";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import PropertyDetailClient from "../PropertyDetailClient";



interface ApplicantPropertyDetailPageProps {
  params: { id: string };
}

export default async function ApplicantPropertyDetailPage({ params }: ApplicantPropertyDetailPageProps) {
  const propertiesCollection = await getCollection("properties");
  const property = await propertiesCollection.findOne({ _id: new ObjectId(params.id) });

  if (!property) return notFound();

  // Serialize property for client component
  const safeProperty = {
    ...property,
    _id: property._id?.toString?.() ?? property._id,
    landlordId: property.landlordId?.toString?.() ?? property.landlordId,
    rooms: Array.isArray(property.rooms)
      ? property.rooms.map((room: any) => ({
          ...room,
          _id: room._id?.toString?.() ?? room._id,
        }))
      : [],
    photos: Array.isArray(property.photos)
      ? property.photos.map((photo: any) => ({ ...photo }))
      : [],
    createdAt: property.createdAt?.toISOString?.() ?? property.createdAt,
    updatedAt: property.updatedAt?.toISOString?.() ?? property.updatedAt,
  };

  return <PropertyDetailClient property={safeProperty} propertyId={params.id} />;
}
