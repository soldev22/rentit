import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getTenancyApplicationById, updateTenancyApplication } from "@/lib/tenancy-application";
import { auditEvent } from "@/lib/audit";

const ChecklistItemSchema = z.object({
  key: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(120),
  checked: z.boolean(),
  comment: z.string().trim().max(300).optional(),
});

const BodySchema = z.object({
  notes: z.string().max(2000).optional(),
  checklist: z.array(ChecklistItemSchema).max(25).optional(),
  stage1Complete: z.boolean().optional(),
  viewingOccurred: z.boolean().optional(),
});

export async function PUT(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "LANDLORD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { appId } = await context.params;
  const application = await getTenancyApplicationById(appId);
  if (!application?._id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (application.landlordId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const landlordObjectId = ObjectId.isValid(session.user.id) ? new ObjectId(session.user.id) : undefined;

  const prevViewingOccurred = application.stage1.viewingSummary?.viewingOccurred === true;

  const hasViewingOccurred = Object.prototype.hasOwnProperty.call(parsed.data, 'viewingOccurred');
  const hasNotes = Object.prototype.hasOwnProperty.call(parsed.data, 'notes');
  const hasChecklist = Object.prototype.hasOwnProperty.call(parsed.data, 'checklist');
  const hasStage1Complete = Object.prototype.hasOwnProperty.call(parsed.data, 'stage1Complete');

  const nextViewingOccurredAt = (() => {
    if (!hasViewingOccurred) return undefined;
    if (parsed.data.viewingOccurred === true) {
      return application.stage1.viewingSummary?.viewingOccurredAt ?? now;
    }
    return null;
  })();

  const nextViewingOccurred = hasViewingOccurred ? parsed.data.viewingOccurred === true : prevViewingOccurred;

  const nextSummary = {
    ...(application.stage1.viewingSummary ?? {}),
    notes: parsed.data.notes ?? application.stage1.viewingSummary?.notes,
    checklist: parsed.data.checklist ?? application.stage1.viewingSummary?.checklist,
    savedAt: now,
    completedBy: landlordObjectId ?? application.stage1.viewingSummary?.completedBy,
    ...(hasViewingOccurred
      ? {
          viewingOccurred: parsed.data.viewingOccurred,
          viewingOccurredAt: nextViewingOccurredAt,
        }
      : {}),
    ...(parsed.data.stage1Complete
      ? {
          completedAt: application.stage1.viewingSummary?.completedAt ?? now,
        }
      : {}),
  };

  const ok = await updateTenancyApplication(appId, {
    stage1: {
      ...application.stage1,
      viewingSummary: nextSummary,
    },
  });

  if (!ok) return NextResponse.json({ error: "Failed to save" }, { status: 500 });

  const changed: string[] = [];
  if (hasNotes) changed.push('notes');
  if (hasChecklist) changed.push('checklist');
  if (hasViewingOccurred) changed.push('viewingOccurred');
  if (hasStage1Complete && parsed.data.stage1Complete === true) changed.push('stage1Complete');

  await auditEvent({
    action: "VIEWING_CHECKLIST_UPDATED",
    actorUserId: session.user.id,
    tenancyApplicationId: String(application._id),
    propertyId: application.propertyId.toString(),
    description: changed.length
      ? `Updated viewing checklist (${changed.join(', ')})`
      : 'Updated viewing checklist',
    metadata: {
      stage: 1,
      changed,
    },
  }).catch(() => undefined);

  // Stage 1 milestone: the viewing has taken place.
  if (hasViewingOccurred && !prevViewingOccurred && nextViewingOccurred && typeof nextViewingOccurredAt === 'string') {
    await auditEvent({
      action: "VIEWING_OCCURRED_RECORDED",
      actorUserId: session.user.id,
      tenancyApplicationId: String(application._id),
      propertyId: application.propertyId.toString(),
      description: "Viewing took place",
      metadata: {
        stage: 1,
        viewingOccurredAt: nextViewingOccurredAt,
      },
    }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true, viewingSummary: nextSummary });
}
