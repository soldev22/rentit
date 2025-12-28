import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { getTenancyApplicationById, TenancyApplication } from "@/lib/tenancy-application";
import { getCollection } from "@/lib/db";
// TODO: Ensure TenancyApplicationManager exists at src/components/TenancyApplicationManager.tsx
// If it does not exist, create it or update the import path to the correct location.
import TenancyApplicationManager from "@/components/TenancyApplicationManager";

export const dynamic = 'force-dynamic';

async function getPropertyTitle(propertyId: string) {
  const properties = await getCollection('properties');
  const property = await properties.findOne({ _id: new ObjectId(propertyId) });
  return property?.title || 'Unknown Property';
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

  // Get property title
  const propertyTitle = await getPropertyTitle(application.propertyId.toString());

  const serializedApplication = JSON.parse(JSON.stringify(application));

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tenancy Application</h1>
        <p className="text-gray-600">
          {application.applicantName} - {propertyTitle}
        </p>
      </div>

      <TenancyApplicationManager
        application={serializedApplication as TenancyApplication}
      />
    </div>
  );
}