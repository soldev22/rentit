import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import Link from "next/link";
import { getUnifiedApplicationStatusView } from "@/lib/tenancyApplicationStatus";
import { formatPropertyLabel } from "@/lib/formatPropertyLabel";
import { TENANCY_APPLICATION_STAGE_LABELS } from "@/lib/tenancyApplicationStages";

export const dynamic = 'force-dynamic';


import type { TenancyApplication } from '@/lib/tenancy-application';

async function getLandlordApplications(landlordId: string): Promise<TenancyApplication[]> {
  const applications = await getCollection('tenancy_applications');
  const landlordObjectId = ObjectId.isValid(landlordId) ? new ObjectId(landlordId) : null;
  const results = await applications
    .find(
      landlordObjectId
        ? { $or: [{ landlordId: landlordObjectId }, { landlordId }] }
        : { landlordId }
    )
    .sort({ createdAt: -1 })
    .toArray();
  // Cast each result to TenancyApplication (runtime check omitted for brevity)
  return results as TenancyApplication[];
}

async function getPropertyTitle(propertyId: string) {
  const properties = await getCollection('properties');
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

export default async function LandlordTenancyApplicationsPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  if (session.user?.role !== "LANDLORD") redirect("/dashboard");

  const applications = await getLandlordApplications(session.user.id);

  // Get property titles for each application
  const applicationsWithTitles = await Promise.all(
    applications.map(async (app) => ({
      ...app,
      propertyTitle: await getPropertyTitle(app.propertyId.toString())
    }))
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tenancy Applications</h1>
        <p className="text-gray-600">Manage tenancy applications for your properties</p>
      </div>

      {applicationsWithTitles.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
          <p className="text-gray-600">Tenancy applications will appear here once tenants start the application process.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applicationsWithTitles.map((application: TenancyApplication & { propertyTitle: string }) => {
            if (!application._id) return null;
            const unified = getUnifiedApplicationStatusView(application);

            const stage2ApprovedAndNotified =
              application.stage2?.landlordDecision?.status === "pass" &&
              Boolean(application.stage2?.landlordDecision?.notifiedAt);
            const stage2Complete =
              String(application.stage2?.status) === "complete" || stage2ApprovedAndNotified;

            // Some legacy records start with currentStage=3 even while Stage 2 checks are still in progress.
            // Treat Stage 2 as current until it's complete, then move into Stage 3.
            const effectiveCurrentStage: 1 | 2 | 3 | 4 | 5 | 6 = (() => {
              let stage: number = application.currentStage ?? 1;

              if (!stage2Complete && stage >= 3 && application.stage3?.status === "pending") {
                stage = 2;
              }

              if (application.stage6?.status === "completed" || application.status === "completed") {
                stage = Math.max(stage, 6);
              } else if (
                application.stage5?.status === "scheduled" ||
                application.stage5?.status === "confirmed"
              ) {
                stage = Math.max(stage, 5);
              } else if (
                application.stage4?.status === "signed_online" ||
                application.stage4?.status === "signed_physical" ||
                application.stage4?.status === "completed"
              ) {
                stage = Math.max(stage, 4);
              } else if (
                application.stage3?.status === "sent" ||
                application.stage3?.status === "received"
              ) {
                stage = Math.max(stage, 3);
              } else if (stage2Complete) {
                stage = Math.max(stage, 3);
              } else if (String(application.stage1?.status) === "agreed") {
                stage = Math.max(stage, 2);
              }

              return Math.min(6, Math.max(1, stage)) as 1 | 2 | 3 | 4 | 5 | 6;
            })();
            return (
              <div key={application._id.toString()} className="bg-white rounded-lg shadow p-6">
                {/* Debug output removed */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{application.applicantName}</h3>
                  <p className="text-gray-600">{application.applicantEmail}</p>
                  <p className="text-sm text-gray-500">{application.propertyTitle}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-700 font-medium">{unified.label}</p>
                  {unified.detail ? (
                    <p className="text-xs text-gray-500 mt-0.5">{unified.detail}</p>
                  ) : null}
                </div>
              </div>

              {/* Progress indicator */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span>1. {TENANCY_APPLICATION_STAGE_LABELS[1]}</span>
                  <span>2. {TENANCY_APPLICATION_STAGE_LABELS[2]}</span>
                  <span>3. {TENANCY_APPLICATION_STAGE_LABELS[3]}</span>
                  <span>4. {TENANCY_APPLICATION_STAGE_LABELS[4]}</span>
                  <span>5. {TENANCY_APPLICATION_STAGE_LABELS[5]}</span>
                  <span>6. {TENANCY_APPLICATION_STAGE_LABELS[6]}</span>
                </div>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5, 6].map((stageNum) => {
                    let color = "bg-gray-200";
                    if (stageNum < effectiveCurrentStage) color = "bg-green-500";
                    if (stageNum === effectiveCurrentStage) color = "bg-blue-500";
                    return <div key={stageNum} className={`flex-1 h-2 rounded ${color}`} />;
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Started {new Date(application.createdAt).toLocaleDateString()}
                </div>
                <Link
                  href={`/landlord/applications/${application._id.toString()}`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Manage Application
                </Link>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}