import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getTenancyApplicationById, updateTenancyApplication } from "@/lib/tenancy-application";

const ChecklistItemSchema = z.object({
  key: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(120),
  checked: z.boolean(),
  comment: z.string().trim().max(300).optional(),
});

const BodySchema = z.object({
  notes: z.string().max(2000).optional(),
  checklist: z.array(ChecklistItemSchema).max(25).optional(),
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

  const nextSummary = {
    ...(application.stage1.viewingSummary ?? {}),
    notes: parsed.data.notes ?? application.stage1.viewingSummary?.notes,
    checklist: parsed.data.checklist ?? application.stage1.viewingSummary?.checklist,
    savedAt: now,
    completedBy: landlordObjectId ?? application.stage1.viewingSummary?.completedBy,
  };

  const ok = await updateTenancyApplication(appId, {
    stage1: {
      ...application.stage1,
      viewingSummary: nextSummary,
    },
  });

  if (!ok) return NextResponse.json({ error: "Failed to save" }, { status: 500 });

  return NextResponse.json({ ok: true, viewingSummary: nextSummary });
}
