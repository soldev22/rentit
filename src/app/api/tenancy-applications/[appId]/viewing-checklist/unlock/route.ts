import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getTenancyApplicationById, updateTenancyApplication } from "@/lib/tenancy-application";
import { auditEvent } from "@/lib/audit";

export async function POST(_req: NextRequest, context: { params: Promise<{ appId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "LANDLORD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { appId } = await context.params;
  const application = await getTenancyApplicationById(appId);
  if (!application?._id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (application.landlordId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = application.stage1.viewingSummary;
  if (!existing?.sentToApplicantAt) {
    return NextResponse.json({ error: "Not sent yet" }, { status: 409 });
  }

  if (existing.editingUnlockedAt) {
    return NextResponse.json({ ok: true, alreadyUnlocked: true });
  }

  const nowIso = new Date().toISOString();
  const landlordObjectId = ObjectId.isValid(session.user.id) ? new ObjectId(session.user.id) : undefined;

  const nextSummary = {
    ...existing,
    editingUnlockedAt: nowIso,
    editingUnlockedBy: landlordObjectId,
  };

  const ok = await updateTenancyApplication(appId, {
    stage1: {
      ...application.stage1,
      viewingSummary: nextSummary,
    },
  });

  if (!ok) return NextResponse.json({ error: "Failed to unlock" }, { status: 500 });

  await auditEvent({
    action: "VIEWING_CHECKLIST_UNLOCKED",
    actorUserId: session.user.id,
    tenancyApplicationId: String(application._id),
    propertyId: application.propertyId.toString(),
    description: 'Unlocked viewing checklist for resend',
    metadata: {
      stage: 1,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
