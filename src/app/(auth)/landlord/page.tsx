import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function LandlordDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "LANDLORD") {
    redirect("/login");
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">
        Landlord Dashboard
      </h1>

      <p className="mt-2 text-gray-600">
        Welcome back.
      </p>
    </div>
  );
}
