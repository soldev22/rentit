import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import Link from "next/link";

// Reuse the Property type
import InterestDialogWrapper from "./InterestDialogWrapper";

type PropertyDoc = {
  _id: ObjectId;
  title?: string;
  status?: string;
  rentPcm?: number;
  createdAt?: string;
  address?: {
    line1?: string;
    city?: string;
    postcode?: string;
  };
  interests?: any[];
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
  allProperties.forEach((p: PropertyDoc) => {
    statusCounts[p.status ?? "draft"] = (statusCounts[p.status ?? "draft"] || 0) + 1;
  });

  // Total revenue (sum of rentPcm for all properties)
  const totalRevenue = allProperties.reduce((sum: number, p: PropertyDoc) => sum + (p.rentPcm ?? 0), 0);

  // Only properties with registered interests
  const propertiesWithInterests = allProperties
    .filter((doc: PropertyDoc) => Array.isArray(doc.interests) && doc.interests.length > 0)
    .sort((a: PropertyDoc, b: PropertyDoc) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .map((doc: PropertyDoc) => ({
      _id: doc._id.toString(),
      title: doc.title ?? "",
      status: doc.status ?? "draft",
      rentPcm: doc.rentPcm ?? 0,
      address: {
        line1: doc.address?.line1 ?? "",
        city: doc.address?.city ?? "",
        postcode: doc.address?.postcode ?? "",
      },
      createdAt: doc.createdAt || "",
      interests: doc.interests ?? [],
    }));

  // Fetch submitted applications count for this landlord
  const tenancyApplications = await getCollection('tenancy_applications');
  const submittedApplicationsCount = await tenancyApplications.countDocuments({ landlordId: landlordObjectId });

  return (
    <div className="w-full pt-6">
      <div className="flex items-center mb-4 gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <span className="inline-block bg-[#6b4eff] text-white text-xs font-semibold px-3 py-1 rounded-full align-middle">Next Version</span>
      </div>
      <div className="flex gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-4 flex-1">
          <div className="text-3xl font-bold">{allProperties.length}</div>
          <div className="text-gray-600">Total Properties</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex-1">
          <div className="text-3xl font-bold">£{totalRevenue.toLocaleString("en-GB")}</div>
          <div className="text-gray-600">Total Revenue (pcm)</div>
        </div>
        {/* Applications Submitted tile */}
        <Link href="/landlord/applications" className="bg-white rounded-lg shadow p-4 flex-1 hover:bg-indigo-50 transition-colors cursor-pointer block">
          <div className="text-3xl font-bold">{submittedApplicationsCount}</div>
          <div className="text-gray-600">Applications Submitted</div>
        </Link>
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="bg-white rounded-lg shadow p-4 flex-1">
            <div className="text-3xl font-bold">{count}</div>
            <div className="text-gray-600 capitalize">{status}</div>
          </div>
        ))}
      </div>
      <div className="mb-4 mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Properties with Registered Interests</h2>
        <div className="flex gap-3">
          <Link href="/landlord/properties" className="text-[#6b4eff] font-semibold hover:underline">
            View all listings →
          </Link>
          <Link href="/landlord/properties/new" className="inline-block rounded-md bg-[#6b4eff] px-4 py-2 font-semibold text-white ml-2">
            + Create Property
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {propertiesWithInterests.length === 0 ? (
          <div className="col-span-full text-gray-600 text-center py-8">
            No properties have registered interest yet.
          </div>
        ) : (
          propertiesWithInterests.map((property) => (
            <InterestDialogWrapper key={property._id} property={property} />
          ))
        )}
      </div>
    </div>
  );
}
