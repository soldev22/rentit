import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { getTenancyApplicationById, TenancyApplication } from "@/lib/tenancy-application";
import { getCollection } from "@/lib/db";
import { getUnifiedApplicationStatusView } from "@/lib/tenancyApplicationStatus";
// TODO: Ensure TenancyApplicationManager exists at src/components/TenancyApplicationManager.tsx
// If it does not exist, create it or update the import path to the correct location.
import TenancyApplicationManager from "@/components/TenancyApplicationManager";
import ApplicationAuditTimeline from "@/components/audit/ApplicationAuditTimeline";
import Link from "next/link";

export const dynamic = 'force-dynamic';

async function getPropertySummary(propertyId: string): Promise<{
  title: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    postcode?: string;
  };
}> {
  const properties = await getCollection('properties');
  const property = await properties.findOne({ _id: new ObjectId(propertyId) });

  return {
    title: property?.title || 'Unknown Property',
    address: property?.address
  };
}

export default async function LandlordApplicationDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "LANDLORD") redirect("/dashboard");

  const { id } = await params;

  // Get the application
  const application = await getTenancyApplicationById(id);
  if (!application) {
    notFound();
  }

  // Check if the user owns this application (is the landlord)
  if (application.landlordId.toString() !== session.user.id) {
    notFound();
  }

  // Get property summary
  const propertySummary = await getPropertySummary(application.propertyId.toString());
  const propertyAddress = [
    propertySummary.address?.line1,
    propertySummary.address?.line2,
    propertySummary.address?.city,
    propertySummary.address?.postcode
  ]
    .filter(Boolean)
    .join(", ");

  const unifiedStatus = getUnifiedApplicationStatusView(application);

  const displayStatusLabel =
    unifiedStatus.label === "Awaiting applicant confirmation"
      ? "In progress"
      : unifiedStatus.label;

  const serializedApplication = JSON.parse(JSON.stringify(application));

  const hasConsentToProceed = application.stage1?.viewingSummary?.applicantResponse?.status === 'confirmed';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tenancy Application</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-gray-700">
          <span className="inline-block rounded-md bg-blue-50 px-3 py-1 font-semibold text-blue-900">
            {application.applicantName}
          </span>
          {application.coTenant?.name ? (
            <>
              <span className="text-gray-400">+</span>
              <span className="inline-block rounded-md bg-blue-50 px-3 py-1 font-semibold text-blue-900">
                {application.coTenant.name}
              </span>
            </>
          ) : null}
          <span className="text-gray-600">-</span>
          <span className="text-gray-700">{propertySummary.title}</span>
        </div>
        {propertyAddress ? (
          <p className="mt-1 inline-block rounded-md bg-blue-50 px-3 py-1 font-semibold text-blue-900">
            {propertyAddress}
          </p>
        ) : null}
        <div className="mt-2">
          <div className="inline-flex flex-col">
            <span className="inline-block rounded-lg bg-blue-600 px-5 py-3 text-xl font-bold text-white shadow-sm">
              {displayStatusLabel}
            </span>
            {unifiedStatus.detail ? (
              <span className="mt-1 text-sm text-gray-700">{unifiedStatus.detail}</span>
            ) : null}
          </div>
        </div>
      </div>

      <TenancyApplicationManager
        application={serializedApplication as TenancyApplication}
      />

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Stage 1 – Consent to proceed</div>
            <div className="mt-1 text-sm text-gray-600">
              Send a defensible letter confirming the next stage after consent.
            </div>
          </div>

          <Link
            href={`/landlord/applications/${encodeURIComponent(id)}/proceed-letter`}
            aria-disabled={!hasConsentToProceed}
            className={
              hasConsentToProceed
                ? "rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                : "pointer-events-none rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-500"
            }
            title={!hasConsentToProceed ? "Requires applicant consent to proceed" : undefined}
          >
            Proceed letter
          </Link>
        </div>
      </div>

      <div id="activity" className="mt-6">
        <ApplicationAuditTimeline appId={id} variant="light" />
      </div>
    </div>
  );
}