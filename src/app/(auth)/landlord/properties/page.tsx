export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import Link from "next/link";
import PropertyGrid from "./PropertyGrid";

type Property = {
  _id: string;
  title: string;
  status: "draft" | "listed" | "paused" | "let" | "breached";
  rentPcm: number;
  description?: string;
  deposit?: number;
  amenities?: string[];
  virtualTourUrl?: string;
  viewingInstructions?: string;
  address: {
    line1?: string;
    city?: string;
    postcode?: string;
  };
  photos?: { url: string; blobName: string; isHero?: boolean }[];
  furnished?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm?: number;
  tenancyLengthMonths?: number;
  billsIncluded?: string[];
  petsAllowed?: boolean;
  smokingAllowed?: boolean;
  epcRating?: string;
  councilTaxBand?: string;
  parking?: string;
  floor?: string;
  hmoLicenseRequired?: boolean;
  createdAt: string;
  updatedAt?: string;
  interests?: { renterId: string; message?: string }[];
};

const PAGE_SIZE = 12;

export default async function LandlordPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  console.log("🔥 PAGE HIT: landlord/properties");

  // Resolve search params
  const resolvedSearchParams = await searchParams;
  const page = Math.max(1, Number(resolvedSearchParams.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  // Auth guard
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  if (!session.user || session.user.role !== "LANDLORD") redirect("/dashboard");

  // DB
  const collection = await getCollection("properties");
  const landlordObjectId = new ObjectId(session.user.id);

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

  const properties: Property[] = rawProperties.map((doc: unknown) => {
    const d = doc as {
      _id: ObjectId | string;
      title?: string;
      status?: "draft" | "listed" | "paused" | "let" | "breached";
      rentPcm?: number;
      description?: string;
      deposit?: number;
      amenities?: string[];
      virtualTourUrl?: string;
      viewingInstructions?: string;
      address?: {
        line1?: string;
        city?: string;
        postcode?: string;
      };
      photos?: { url: string; blobName: string; isHero?: boolean }[];
      furnished?: boolean;
      bedrooms?: number;
      bathrooms?: number;
      sizeSqm?: number;
      tenancyLengthMonths?: number;
      billsIncluded?: string[];
      petsAllowed?: boolean;
      smokingAllowed?: boolean;
      epcRating?: string;
      councilTaxBand?: string;
      parking?: string;
      floor?: string;
      hmoLicenseRequired?: boolean;
      createdAt?: string | Date;
      updatedAt?: string | Date;
      interests?: { renterId: string; message?: string }[];
    };
    return {
      _id: typeof d._id === "string" ? d._id : d._id?.toString() ?? "",
      title: d.title ?? "",
      status: d.status ?? "draft",
      rentPcm: d.rentPcm ?? 0,
      description: d.description ?? "",
      deposit: d.deposit ?? undefined,
      amenities: d.amenities ?? [],
      virtualTourUrl: d.virtualTourUrl ?? "",
      viewingInstructions: d.viewingInstructions ?? "",
      address: {
        line1: d.address?.line1 ?? "",
        city: d.address?.city ?? "",
        postcode: d.address?.postcode ?? "",
      },
      photos: d.photos ?? [],
      furnished: d.furnished ?? false,
      bedrooms: d.bedrooms ?? undefined,
      bathrooms: d.bathrooms ?? undefined,
      sizeSqm: d.sizeSqm ?? undefined,
      tenancyLengthMonths: d.tenancyLengthMonths ?? undefined,
      billsIncluded: d.billsIncluded ?? [],
      petsAllowed: d.petsAllowed ?? false,
      smokingAllowed: d.smokingAllowed ?? false,
      epcRating: d.epcRating ?? "",
      councilTaxBand: d.councilTaxBand ?? "",
      parking: d.parking ?? "",
      floor: d.floor ?? "",
      hmoLicenseRequired: d.hmoLicenseRequired ?? false,
      createdAt: d.createdAt
        ? typeof d.createdAt === "string"
          ? d.createdAt
          : (d.createdAt as Date).toISOString()
        : "",
      updatedAt: d.updatedAt
        ? typeof d.updatedAt === "string"
          ? d.updatedAt
          : (d.updatedAt as Date).toISOString()
        : undefined,
      interests: d.interests ?? [],
    };
  });

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
        <Link
          href="/landlord/properties/new"
          className="inline-block rounded-md bg-[#6b4eff] px-4 py-2 font-semibold text-white"
        >
          + Create Property
        </Link>
      </div>
    </div>
  );
}