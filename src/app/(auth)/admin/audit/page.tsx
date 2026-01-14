import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import { formatDateTime } from "@/lib/formatDate";
import { ObjectId } from "mongodb";
import { formatAuditActivity } from "@/lib/auditActivity";

type AuditEvent = {
  _id: any;
  action: string;
  actorUserId: string;
  targetUserId?: string | null | ObjectId;
  description?: string;
  success?: boolean;
  source?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/unauthorized");
  }

  const client = await clientPromise;
  const db = client.db();

  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});

  const actorQueryRaw = resolvedSearchParams?.actor;
  const actorQuery =
    typeof actorQueryRaw === "string" ? actorQueryRaw.trim() : "";
  const actionRaw = resolvedSearchParams?.action;
  const action = typeof actionRaw === "string" ? actionRaw.trim() : "";
  const successRaw = resolvedSearchParams?.success;
  const success = typeof successRaw === "string" ? successRaw.trim() : "";
  const limitRaw = resolvedSearchParams?.limit;
  const limitStr = typeof limitRaw === "string" ? limitRaw.trim() : "100";
  const limit = Math.max(1, Math.min(500, Number(limitStr) || 100));

  let resolvedActorUserId: string | null = null;

  if (actorQuery) {
    if (actorQuery.includes("@")) {
      const user = await db
        .collection("users")
        .findOne(
          { email: actorQuery.toLowerCase() },
          { projection: { _id: 1 } }
        );
      resolvedActorUserId = user?._id?.toString?.() ?? null;
    } else {
      resolvedActorUserId = actorQuery;
    }
  }

  const filter: Record<string, any> = {};
  if (resolvedActorUserId) filter.actorUserId = resolvedActorUserId;
  if (action) filter.action = action;
  if (success === "true") filter.success = true;
  if (success === "false") filter.success = false;

  // 1️⃣ Load audit events
  const rawEvents = await db
    .collection("audit_events")
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const events: AuditEvent[] = rawEvents.map((doc) => ({
    _id: doc._id,
    action: doc.action ?? "",
    actorUserId: doc.actorUserId?.toString?.() ?? "",
    targetUserId: doc.targetUserId?.toString?.() ?? null,
    description: doc.description,
    success: doc.success,
    source: doc.source,
    metadata: doc.metadata ?? undefined,
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

      <form className="mb-6 flex flex-wrap gap-2" method="GET">
        <input
          name="actor"
          placeholder="Actor user id or email"
          defaultValue={actorQuery}
          className="w-[320px] rounded border border-gray-300 px-3 py-2"
        />

        <input
          name="action"
          placeholder="Action (optional)"
          defaultValue={action}
          className="w-[240px] rounded border border-gray-300 px-3 py-2"
        />

        <select
          name="success"
          defaultValue={success}
          aria-label="Filter by success"
          className="rounded border border-gray-300 px-3 py-2"
        >
          <option value="">Any result</option>
          <option value="true">Success only</option>
          <option value="false">Failures only</option>
        </select>

        <select
          name="limit"
          defaultValue={String(limit)}
          aria-label="Number of results"
          className="rounded border border-gray-300 px-3 py-2"
        >
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
          <option value="500">500</option>
        </select>

        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white"
        >
          Filter
        </button>
      </form>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="text-left">Time</th>
            <th className="text-left">Activity</th>
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

              <td>
                <div className="flex flex-col">
                  <span>
                    {formatAuditActivity({
                      action: e.action,
                      description: e.description,
                      source: e.source,
                      metadata: e.metadata ?? null,
                    })}
                  </span>
                  <span className="text-xs text-gray-600">
                    {(() => {
                      const method = asString(e.metadata?.method).toUpperCase();
                      const path = asString(e.metadata?.path) || asString(e.source);
                      const status = asNumber(e.metadata?.status);
                      const durationMs = asNumber(e.metadata?.durationMs);

                      const parts = [
                        method && path ? `${method} ${path}` : path,
                        typeof status === "number" ? `status ${status}` : "",
                        typeof durationMs === "number" ? `${durationMs}ms` : "",
                      ].filter(Boolean);

                      return parts.join(" • ") || "";
                    })()}
                  </span>
                </div>
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
