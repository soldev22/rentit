import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import Link from "next/link";

// Reuse the Property type
import PropertyGrid from "../landlord/properties/PropertyGrid";
import InterestDialogWrapper from "./InterestDialogWrapper";

type Property = {
  _id: string;
  title: string;
  status: string;
  rentPcm: number;
  address: {
    line1?: string;
    city?: string;
    postcode?: string;
  };
  createdAt: string;
};

export default async function LandlordDashboardSummary({ landlordId }: { landlordId: string }) {
  const collection = await getCollection("properties");
  const landlordObjectId = new ObjectId(landlordId);

  // Fetch all properties for counts
  const allProperties = await collection
    .find({
      $or: [
        { landlordId: landlordObjectId },
        { landlordId },
      ],
    })
    .toArray();

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  allProperties.forEach((p: any) => {
    statusCounts[p.status ?? "draft"] = (statusCounts[p.status ?? "draft"] || 0) + 1;
  });

  // All properties with interests
  const propertiesWithInterests = allProperties
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((doc: any) => ({
      _id: doc._id.toString(),
      title: doc.title ?? "",
      status: doc.status ?? "draft",
      rentPcm: doc.rentPcm ?? 0,
      address: {
        line1: doc.address?.line1 ?? "",
        city: doc.address?.city ?? "",
        postcode: doc.address?.postcode ?? "",
      },
      createdAt: doc.createdAt
        ? typeof doc.createdAt === "string"
          ? doc.createdAt
          : doc.createdAt.toISOString()
        : "",
      interests: doc.interests ?? [],
    }));

  return (
    <div className="w-full max-w-5xl mx-auto pt-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="flex gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-4 flex-1">
          <div className="text-3xl font-bold">{allProperties.length}</div>
          <div className="text-gray-600">Total Properties</div>
        </div>
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="bg-white rounded-lg shadow p-4 flex-1">
            <div className="text-3xl font-bold">{count}</div>
            <div className="text-gray-600 capitalize">{status}</div>
          </div>
        ))}
      </div>
      <div className="mb-4 mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">All Properties & Registered Interests</h2>
        <div className="flex gap-3">
          <Link href="/landlord/properties" className="text-[#6b4eff] font-semibold hover:underline">
            View all listings →
          </Link>
          <Link href="/landlord/properties/new" className="inline-block rounded-md bg-[#6b4eff] px-4 py-2 font-semibold text-white ml-2">
            + Create Property
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client-side interactivity for interest dialog */}
        {/* Render InterestDialogWrapper as a client component below */}
        <InterestDialogWrapper properties={propertiesWithInterests} />
      </div>
    </div>
  );
}
