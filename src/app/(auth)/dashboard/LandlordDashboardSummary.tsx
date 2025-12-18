import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import Link from "next/link";

// Reuse the Property type
import PropertyGrid from "../landlord/properties/PropertyGrid";

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

  // Latest 4 properties
  const latestProperties = allProperties
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Latest Properties</h2>
        <Link href="/landlord/properties" className="text-[#6b4eff] font-semibold hover:underline">
          View all properties →
        </Link>
      </div>
      <PropertyGrid properties={latestProperties} />
    </div>
  );
}
