import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getTenancyApplicationById, updateTenancyApplication } from "@/lib/tenancy-application";
import type { TenancyApplication } from "@/lib/tenancy-application";

const BodySchema = z
  .object({
    status: z.enum(["pending", "pass", "fail"]),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "LANDLORD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { appId } = await params;
  const application = await getTenancyApplicationById(appId);
  if (!application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (application.landlordId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const decidedAt = new Date().toISOString();
  const updates: Partial<TenancyApplication> = {
    stage2: {
      ...application.stage2,
      landlordDecision: {
        status: parsed.data.status,
        notes: parsed.data.notes || undefined,
        decidedAt,
        decidedBy: new ObjectId(session.user.id),
      },
    },
  };

  // If landlord explicitly fails, reflect that in overall status.
  // If they reset to pending/pass, keep existing overall status (do not auto-advance stages).
  if (parsed.data.status === "fail") {
    updates.status = "refused";
  }

  const ok = await updateTenancyApplication(appId, updates);
  if (!ok) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
