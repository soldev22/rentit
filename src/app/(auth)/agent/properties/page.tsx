import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getCollection } from "@/lib/db";
import AgentPropertyGrid from "../properties/AgentPropertyGrid";

const PAGE_SIZE = 12;

export default async function AgentPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  if (session.user?.role !== "AGENT") redirect("/dashboard");

  // Get all landlordIds this agent manages
  const agentId = session.user.id;
  const agentLandlordsCollection = await getCollection("agentLandlords");
  const landlordLinks = await agentLandlordsCollection.find({ agentId }).toArray();
  const landlordIds = landlordLinks.map((l: any) => l.landlordId);

  const { page: pageParam, q } = await searchParams;

  const page = Math.max(1, Number(pageParam) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const query = q?.trim() || "";

  const collection = await getCollection("properties");

  // 🔍 Address-first search
  const filter: any = {
    landlordId: { $in: landlordIds },
    ...(query && {
      $or: [
        { "address.line1": { $regex: query, $options: "i" } },
        { "address.city": { $regex: query, $options: "i" } },
        { "address.postcode": { $regex: query, $options: "i" } },
      ],
    }),
  };

  const total = await collection.countDocuments(filter);

  const raw = await collection
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(PAGE_SIZE)
    .toArray();

  const properties = raw.map((doc: any) => ({
    _id: doc._id.toString(),
    title: doc.title,
    status: doc.status,
    rentPcm: doc.rentPcm,
    address: doc.address,
    createdAt: doc.createdAt?.toISOString?.() ?? "",
  }));

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">
        All Managed Properties
      </h1>

      <AgentPropertyGrid
        properties={properties}
        page={page}
        totalPages={totalPages}
        query={query}
      />
    </div>
  );
}
