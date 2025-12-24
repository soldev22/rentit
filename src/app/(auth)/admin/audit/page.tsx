import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import { formatDateTime } from "@/lib/formatDate";
import { ObjectId } from "mongodb";

type AuditEvent = {
  _id: any;
  action: string;
  actorUserId: string;
  targetUserId?: string | null | ObjectId;
  description?: string;
  success?: boolean;
  source?: string;
  createdAt?: Date;
};

export default async function AdminAuditPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/unauthorized");
  }

  const client = await clientPromise;
  const db = client.db();

  // 1️⃣ Load audit events
  const rawEvents = await db
    .collection("audit_events")
    .find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  const events: AuditEvent[] = rawEvents.map((doc) => ({
    _id: doc._id,
    action: doc.action ?? "",
    actorUserId: doc.actorUserId?.toString?.() ?? "",
    targetUserId: doc.targetUserId?.toString?.() ?? null,
    description: doc.description,
    success: doc.success,
    source: doc.source,
    createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
  }));

  // 2️⃣ Build actor lookup BEFORE render
  const actorIds = Array.from(
    new Set(events.map((e) => e.actorUserId).filter(Boolean))
  );

  let actorMap = new Map<string, string>();

const objectIdActors = actorIds.filter((id) =>
  ObjectId.isValid(id)
);

if (objectIdActors.length > 0) {
  const users = await db
    .collection("users")
    .find({
      _id: {
        $in: objectIdActors.map((id) => new ObjectId(id)),
      },
    })
    .project({ name: 1, email: 1 })
    .toArray();

  actorMap = new Map(
    users.map((u: any) => [
      u._id.toString(),
      u.name || u.email || u._id.toString(),
    ])
  );
}

  // 3️⃣ Render
  return (
    <div className="p-6 font-sans">
      <h2 className="mb-4">Audit log</h2>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="text-left">Time</th>
            <th className="text-left">Action</th>
            <th className="text-left">Actor</th>
            <th className="text-left">Target</th>
            <th className="text-left">Result</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr
              key={e._id.toString()}
              className="border-b border-gray-200"
            >
              <td>
                {e.createdAt
                  ? formatDateTime(e.createdAt)
                  : "-"}
              </td>

              <td>{e.action}</td>

              <td>
  {actorMap.has(e.actorUserId)
    ? actorMap.get(e.actorUserId)
    : `${e.actorUserId} (no longer exists)`}
</td>

              <td>
                {e.targetUserId
                  ? typeof e.targetUserId === "object" && e.targetUserId !== null && "toString" in e.targetUserId
                    ? (e.targetUserId as { toString: () => string }).toString()
                    : e.targetUserId
                  : "-"}
              </td>

              <td>{e.success === false ? "❌" : "✅"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {events.length === 0 && (
        <p className="mt-4">No audit events yet.</p>
      )}
    </div>
  );
}
