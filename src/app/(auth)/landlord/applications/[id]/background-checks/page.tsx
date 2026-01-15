import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import Link from "next/link";

import { getCollection } from "@/lib/db";
import { getTenancyApplicationById, TenancyApplication } from "@/lib/tenancy-application";
import TenancyApplicationBackgroundChecks from "../../../../../../components/TenancyApplicationBackgroundChecks";

export const dynamic = "force-dynamic";

async function getPropertySummary(propertyId: string): Promise<{
  title: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    postcode?: string;
  };
}> {
  const properties = await getCollection("properties");
  const property = await properties.findOne({ _id: new ObjectId(propertyId) });

  return {
    title: property?.title || "Unknown Property",
    address: property?.address,
  };
}

export default async function LandlordApplicationBackgroundChecksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "LANDLORD") redirect("/dashboard");

  const { id } = await params;

  const application = await getTenancyApplicationById(id);
  if (!application) notFound();

  if (application.landlordId.toString() !== session.user.id) {
    notFound();
  }

  const propertySummary = await getPropertySummary(application.propertyId.toString());
  const propertyAddress = [
    propertySummary.address?.line1,
    propertySummary.address?.line2,
    propertySummary.address?.city,
    propertySummary.address?.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  const serializedApplication = JSON.parse(JSON.stringify(application));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Background Checks</h1>
            <div className="mt-2 text-gray-700">
              <span className="inline-block rounded-md bg-blue-50 px-3 py-1 font-semibold text-blue-900">
                {application.applicantName}
              </span>
              <span className="mx-2 text-gray-400">•</span>
              <span className="text-gray-700">{propertySummary.title}</span>
            </div>
            {propertyAddress ? (
              <p className="mt-1 text-sm text-gray-600">{propertyAddress}</p>
            ) : null}
          </div>

          <Link
            href={`/landlord/applications/${application._id.toString()}`}
            className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 text-sm font-medium"
          >
            Back to application overview
          </Link>
        </div>
      </div>

      <TenancyApplicationBackgroundChecks
        application={serializedApplication as unknown as (TenancyApplication & { _id: string })}
      />
    </div>
  );
}
