
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import LandlordDashboardSummary from "../../dashboard/LandlordDashboardSummary";
import Link from "next/link";

export default async function LandlordDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  if (session.user?.role !== "LANDLORD") redirect("/dashboard");

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-2">Landlord Dashboard</h1>
      <p className="mb-6 text-sm text-gray-600">Manage your properties and view insights.</p>

      <div className="mb-6">
        <Link
          href="/landlord/applications"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
        >
          📋 View Tenancy Applications
        </Link>
      </div>

      <LandlordDashboardSummary landlordId={session.user.id} />
    </div>
  );
}