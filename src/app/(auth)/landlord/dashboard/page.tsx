
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import LandlordDashboardSummary from "../../dashboard/LandlordDashboardSummary";

export default async function LandlordDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  if (session.user?.role !== "LANDLORD") redirect("/dashboard");

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-2">Landlord Dashboard</h1>
      <p className="mb-6 text-sm text-gray-600">Manage your properties and view insights.</p>
      <LandlordDashboardSummary landlordId={session.user.id} />
    </div>
  );
}