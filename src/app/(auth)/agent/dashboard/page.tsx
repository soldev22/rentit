import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireRole } from "@/lib/requireRole";

export default async function AgentDashboardPage() {
  const session = await getServerSession(authOptions);

   requireRole("AGENT", session);
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">
        Agent Dashboard
      </h1>

      <p className="mt-2 text-sm text-gray-600">
        Search and manage properties across your assigned landlords.
      </p>

      <div className="mt-6">
        <a
          href="/agent/properties"
          className="inline-block rounded-md bg-[#6b4eff] px-4 py-2 text-white font-semibold"
        >
          View all properties
        </a>
      </div>
    </div>
  );
}
