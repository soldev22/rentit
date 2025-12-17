import { requireRole } from "@/lib/requireRole";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function LandlordDashboardPage() {
  const session = await getServerSession(authOptions);

 requireRole("LANDLORD", session);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">
        Landlord Dashboard
      </h1>

      <p className="mt-2 text-gray-600">
        You are logged in as a landlord.
      </p>
    </div>
  );
}
