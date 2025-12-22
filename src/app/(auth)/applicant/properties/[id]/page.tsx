import { getCollection } from "@/lib/db";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import PropertyDetailClient from "../PropertyDetailClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

interface ApplicantPropertyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicantPropertyDetailPage({
  params,
}: ApplicantPropertyDetailPageProps) {
  // ✅ UNWRAP params (THIS is the missing piece)
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // ✅ Guard stays valid
  if (!ObjectId.isValid(id)) {
    return notFound();
  }

  const propertiesCollection = await getCollection("properties");

  const property = await propertiesCollection.findOne({
    _id: new ObjectId(id),
  });

  if (!property) return notFound();

  // Check if applicant has already registered interest
  const interests = Array.isArray(property.interests) ? property.interests : [];
  const hasRegisteredInterest = interests.some(
    (i: any) => i.applicantId === userId
  );

  // Serialize for client component
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

  return (
    <PropertyDetailClient
      property={safeProperty}
      propertyId={id}
      hasRegisteredInterest={hasRegisteredInterest}
    />
  );
}
