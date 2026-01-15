import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { withApiAudit } from "@/lib/api/withApiAudit";
import { formatAuditActivity } from "@/lib/auditActivity";

async function getAuditEvents(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const client = await clientPromise;
  const db = client.db();

  const url = new URL(req.url);
  const actorUserId = url.searchParams.get("actorUserId")?.trim() || null;
  const actorEmail = url.searchParams.get("actorEmail")?.trim().toLowerCase() || null;
  const targetUserIdRaw = url.searchParams.get("targetUserId")?.trim() || null;
  const action = url.searchParams.get("action")?.trim() || null;
  const successRaw = url.searchParams.get("success")?.trim() || null;
  const source = url.searchParams.get("source")?.trim() || null;
  const propertyId = url.searchParams.get("propertyId")?.trim() || null;
  const tenancyApplicationIdRaw = url.searchParams.get("tenancyApplicationId")?.trim() || null;
  const tenancyId = url.searchParams.get("tenancyId")?.trim() || null;
  const maintenanceProjectId = url.searchParams.get("maintenanceProjectId")?.trim() || null;

  const limitRaw = url.searchParams.get("limit")?.trim() || "100";
  const limit = Math.max(1, Math.min(500, Number(limitRaw) || 100));

  let resolvedActorUserId = actorUserId;
  if (!resolvedActorUserId && actorEmail) {
    const user = await db
      .collection("users")
      .findOne({ email: actorEmail }, { projection: { _id: 1 } });
    if (user?._id) resolvedActorUserId = user._id.toString();
  }

  const filter: Record<string, any> = {};

  if (resolvedActorUserId) filter.actorUserId = resolvedActorUserId;
  if (action) filter.action = action;
  if (source) filter.source = source;
  if (propertyId) filter.propertyId = propertyId;
  if (tenancyApplicationIdRaw) {
    filter.tenancyApplicationId = ObjectId.isValid(tenancyApplicationIdRaw)
      ? new ObjectId(tenancyApplicationIdRaw)
      : tenancyApplicationIdRaw;
  }
  if (tenancyId) filter.tenancyId = tenancyId;
  if (maintenanceProjectId) filter.maintenanceProjectId = maintenanceProjectId;

  if (successRaw === "true") filter.success = true;
  if (successRaw === "false") filter.success = false;

  if (targetUserIdRaw) {
    filter.targetUserId = ObjectId.isValid(targetUserIdRaw)
      ? new ObjectId(targetUserIdRaw)
      : targetUserIdRaw;
  }

  const events = await db
    .collection("audit_events")
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return NextResponse.json(
    events.map((e) => ({
      ...e,
      _id: e._id.toString(),
      targetUserId: e.targetUserId?.toString?.() ?? null,
      tenancyApplicationId: e.tenancyApplicationId?.toString?.() ?? null,
      createdAt: e.createdAt?.toISOString?.() ?? null,
      activity: formatAuditActivity({
        action: e.action,
        description: e.description,
        source: e.source,
        metadata: e.metadata ?? null,
      }),
    }))
  );
}

export const GET = withApiAudit(getAuditEvents);
