import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function IssuesDashboardPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !["LANDLORD", "AGENT", "ADMIN"].includes(session.user.role)
  ) {
    notFound();
  }

  const client = await clientPromise;
  const db = client.db();

  // 1️⃣ Find properties owned by this landlord
  const properties = await db
    .collection("properties")
    .find({ landlordId: new ObjectId(session.user.id) })
    .toArray();

  const propertyIds = properties.map((p) => p._id);
console.log("SESSION USER", session.user);

  if (!propertyIds.length) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">Maintenance Issues</h1>
        <p className="text-sm text-slate-400 mt-2">
          No properties found.
        </p>
      </main>
    );
  }

  // 2️⃣ Find issues for those properties
  const issues = await db
    .collection("maintenance_projects")
    .find({ propertyId: { $in: propertyIds } })
    .sort({ updatedAt: -1 })
    .toArray();

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Maintenance Issues</h1>

      {issues.length === 0 ? (
        <p className="text-sm text-slate-400">
          No issues reported yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {issues.map((issue: any) => (
            <li
              key={issue._id.toString()}
              className="rounded border border-slate-800 bg-slate-950 p-3"
            >
              <Link
                href={`/dashboard/issues/${issue._id.toString()}`}
                className="block"
              >
                <div className="font-medium">
                  {issue.title}
                </div>

                <div className="text-xs text-slate-400 mt-1">
                  Status: {issue.status}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
  
}
