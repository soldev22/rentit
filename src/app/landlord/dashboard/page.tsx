import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function LandlordDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  if (session.user?.role !== "LANDLORD") redirect("/dashboard");

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Landlord Dashboard</h1>
      <p className="mt-2 text-sm text-gray-600">
        Manage your properties and view insights.
      </p>
      <div className="mt-6">
        <a
          href="/landlord/properties"
          className="inline-block rounded-md bg-[#6b4eff] px-4 py-2 text-white font-semibold"
        >
          View all properties
        </a>
      </div>
    </div>
  );
}