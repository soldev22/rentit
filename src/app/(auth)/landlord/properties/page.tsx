export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

// IMPORTANT: normal import once things are stable
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PropertyGrid = require("./PropertyGrid").default;

type Property = {
  _id: string;
  title: string;
  status: string;
  rentPcm: number;
  description?: string;
  address: {
    line1?: string;
    city?: string;
    postcode?: string;
  };
  createdAt: string;
  photos?: { url: string; blobName: string }[];
  interests?: any[];
};

const PAGE_SIZE = 12;

export default async function LandlordPropertiesPage(
  props: { searchParams?: Promise<{ page?: string }> }
) {
  console.log("🔥 PAGE HIT: landlord/properties");

  // Resolve search params
  let searchParams: { page?: string } = {};
  if (props.searchParams) {
    searchParams =
      typeof (props.searchParams as any)?.then === "function"
        ? await props.searchParams
        : (props.searchParams as any);
  }

  // Auth guard
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  if (!session.user || session.user.role !== "LANDLORD") redirect("/dashboard");

  // DB
  const collection = await getCollection("properties");
  const landlordObjectId = new ObjectId(session.user.id);

  const page = Math.max(1, Number(searchParams.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const filter = {
    $or: [
      { landlordId: landlordObjectId },
      { landlordId: session.user.id },
    ],
  };

  const rawProperties = await collection
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(PAGE_SIZE)
    .toArray();

  console.log(
    "🔥 RAW COUNT:",
    rawProperties.length,
    rawProperties.map((p) => p._id.toString())
  );

  const properties: Property[] = rawProperties.map((doc: any) => ({
    _id: doc._id.toString(),
    title: doc.title ?? "",
    status: doc.status ?? "draft",
    rentPcm: doc.rentPcm ?? 0,
    description: doc.description ?? "",
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
    photos: doc.photos ?? [],
    interests: doc.interests ?? [],
  }));

  console.log("🔥 MAPPED COUNT:", properties.length);



  // Render
  return (
    <div className="w-full pt-0 pl-4 pr-4 pb-3">

      <h1 className="mb-px text-xl font-semibold">
        Your Properties
      </h1>

      {properties.length === 0 ? (
        <p className="text-sm text-gray-600">
          You have not created any properties yet.
        </p>
      ) : (
        <PropertyGrid
          properties={properties}
          page={page}
          totalPages={1}
        />
      )}

      <div className="mt-3">
        <a
          href="/landlord/properties/new"
          className="inline-block rounded-md bg-[#6b4eff] px-4 py-2 font-semibold text-white"
        >
          + Create Property
        </a>
      </div>
    </div>
  );
}

