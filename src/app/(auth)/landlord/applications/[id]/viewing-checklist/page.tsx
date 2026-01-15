import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { formatPropertyLabel } from "@/lib/formatPropertyLabel";
import { getTenancyApplicationById, type TenancyApplication } from "@/lib/tenancy-application";
import ViewingChecklistForm from "@/components/landlord/ViewingChecklistForm";

export const dynamic = "force-dynamic";

async function getPropertyLabel(propertyId: string): Promise<string> {
  const properties = await getCollection("properties");
  const property = await properties.findOne(
    { _id: new ObjectId(propertyId) },
    { projection: { title: 1, address: 1 } }
  );

  const title = typeof property?.title === "string" ? property.title : undefined;
  const address = property?.address as
    | { line1?: string | null; city?: string | null; postcode?: string | null }
    | null
    | undefined;

  return formatPropertyLabel({ title, address });
}

export default async function LandlordViewingChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "LANDLORD") redirect("/dashboard");

  const { id } = await params;
  const application = await getTenancyApplicationById(id);
  if (!application?._id) notFound();

  if (application.landlordId.toString() !== session.user.id) notFound();

  const propertyLabel = await getPropertyLabel(application.propertyId.toString());

  const serializedApplication = JSON.parse(
    JSON.stringify(application)
  ) as unknown as TenancyApplication;

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Viewing checklist</h1>
          <p className="mt-1 text-sm text-slate-600">
            {propertyLabel} · {serializedApplication.applicantName}
          </p>
        </div>
        <Link
          href={`/landlord/applications/${id}`}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Back to application
        </Link>
      </div>

      <ViewingChecklistForm
        appId={id}
        applicantName={serializedApplication.applicantName}
        applicantEmail={serializedApplication.applicantEmail}
        initialSummary={
          (() => {
            const summary = serializedApplication.stage1?.viewingSummary;
            if (!summary) return null;
            if (
              summary.applicantResponse &&
              (summary.applicantResponse.status !== "confirmed" &&
                summary.applicantResponse.status !== "declined" &&
                summary.applicantResponse.status !== "query")
            ) {
              // Omit applicantResponse if status is not allowed
              const { applicantResponse: _applicantResponse, ...rest } = summary;
              return { ...rest };
            }
            return summary;
          })()
        }
      />
    </div>
  );
}
