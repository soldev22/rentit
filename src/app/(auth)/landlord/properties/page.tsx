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
 address: {
  line1?: string;
  city?: string;
  postcode?: string;
};
  createdAt: string;
};

const PAGE_SIZE = 12;

export default async function LandlordPropertiesPage(
  props: { searchParams?: Promise<{ page?: string }> }
) {
  const searchParamsPromise = props.searchParams;
  let searchParams: { page?: string } = {};
  if (searchParamsPromise && typeof searchParamsPromise.then === "function") {
    searchParams = await searchParamsPromise;
  } else if (searchParamsPromise) {
    searchParams = searchParamsPromise as any;
  }
  // 1. Auth guard
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (!session.user || session.user.role !== "LANDLORD") {
    redirect("/dashboard");
  }


  // 2. Pagination logic
  const collection = await getCollection("properties");
  const landlordObjectId = new ObjectId(session.user.id);
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const total = await collection.countDocuments({
    $or: [
      { landlordId: landlordObjectId },
      { landlordId: session.user.id },
    ],
  });

  const rawProperties = await collection
    .find({
      $or: [
        { landlordId: landlordObjectId },
        { landlordId: session.user.id },
      ],
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(PAGE_SIZE)
    .toArray();

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const properties: Property[] = rawProperties.map((doc: any) => ({
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
    photos: doc.photos ?? [],
    interests: doc.interests ?? [],
  }));

  // 3. Render
  return (
    <div className="w-full pt-0 pl-4 pr-4 pb-3">
      <h1 className="mb-px text-xl font-semibold">
        Your Properties
      </h1>


      {properties.length === 0 ? (
        <p>No properties yet. Create your first draft.</p>
      ) : (
        <PropertyGrid properties={properties} page={page} totalPages={totalPages} />
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
