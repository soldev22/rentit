import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import Link from "next/link";
import { getUnifiedApplicationStatusView } from "@/lib/tenancyApplicationStatus";
import { TENANCY_APPLICATION_STAGE_LABELS } from "@/lib/tenancyApplicationStages";

export const dynamic = 'force-dynamic';


import type { TenancyApplication } from '@/lib/tenancy-application';

async function getLandlordApplications(landlordId: string): Promise<TenancyApplication[]> {
  const applications = await getCollection('tenancy_applications');
  const results = await applications
    .find({ landlordId: new ObjectId(landlordId) })
    .sort({ createdAt: -1 })
    .toArray();
  // Cast each result to TenancyApplication (runtime check omitted for brevity)
  return results as TenancyApplication[];
}

async function getPropertyTitle(propertyId: string) {
  const properties = await getCollection('properties');
  const property = await properties.findOne({ _id: new ObjectId(propertyId) });
  return property?.title || 'Unknown Property';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                    {application.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <p className="text-sm text-gray-700 mt-1 font-medium">{unified.label}</p>
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
                      const stageObj = (application as any)[`stage${stageNum}`];
                      let color = 'bg-gray-200';
                      if (stageObj?.status === 'agreed' || stageObj?.status === 'complete' || stageObj?.status === 'signed_online' || stageObj?.status === 'signed_physical' || stageObj?.status === 'scheduled' || stageObj?.status === 'confirmed' || stageObj?.status === 'sent' || stageObj?.status === 'received' || stageObj?.status === 'completed') {
                        color = 'bg-green-500';
                      } else if (stageNum === 1) {
                        color = 'bg-blue-500';
                      }
                      return (
                        <div
                          key={stageNum}
                          className={`flex-1 h-2 rounded ${color}`}
                        />
                      );
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