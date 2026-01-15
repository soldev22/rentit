import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { getTenancyApplicationById } from "@/lib/tenancy-application";
import { withApiAudit } from "@/lib/api/withApiAudit";
import { formatAuditActivity } from "@/lib/auditActivity";

async function getApplicationAudit(req: Request, context: { params: Promise<{ appId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { appId } = await context.params;
  if (!ObjectId.isValid(appId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const application = await getTenancyApplicationById(appId);
  if (!application?._id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "LANDLORD" && role !== "TENANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (role === "LANDLORD" && application.landlordId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (role === "TENANT") {
    const applicantId = application.applicantId?.toString();
    if (!applicantId || applicantId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit")?.trim() || "100";
  const limit = Math.max(1, Math.min(500, Number(limitRaw) || 100));

  const client = await clientPromise;
  const db = client.db();

  const tenancyApplicationId = new ObjectId(appId);

  const events = await db
    .collection("audit_events")
    .find({ tenancyApplicationId })
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

export const GET = withApiAudit(getApplicationAudit);
