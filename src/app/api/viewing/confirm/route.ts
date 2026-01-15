import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { ObjectId } from "mongodb";

import { getCollection } from "@/lib/db";
import { formatPropertyLabel } from "@/lib/formatPropertyLabel";
import { notificationService, type UserContactPreferences } from "@/lib/notification";
import { NotificationTemplates } from "@/lib/notification-templates";
import { auditEvent } from "@/lib/audit";

const BodySchema = z.object({
  token: z.string().min(10),
  decision: z.enum(["confirmed", "declined", "query"]),
  comment: z.string().max(1000).optional(),
}).superRefine((val, ctx) => {
  if (val.decision === 'query') {
    const hasComment = typeof val.comment === 'string' && val.comment.trim().length > 0;
    if (!hasComment) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['comment'],
        message: 'Please enter your query/question',
      });
    }
  }
});

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000";
}

function cleanPrefs(v: unknown): UserContactPreferences | null {
  if (!v || typeof v !== "object") return null;
  const o = v as any;
  const email = Boolean(o.email);
  const sms = Boolean(o.sms);
  const whatsapp = Boolean(o.whatsapp);
  if (!email && !sms && !whatsapp) return null;
  return { email, sms, whatsapp };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const tokenHash = sha256Hex(parsed.data.token);
  const applications = await getCollection("tenancy_applications");

  const application = await applications.findOne({
    "stage1.viewingSummary.confirmationTokenHash": tokenHash,
  });

  if (!application) {
    return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 404 });
  }

  const summary = (application as any)?.stage1?.viewingSummary;
  const expiresAt = summary?.confirmationTokenExpiresAt ? new Date(summary.confirmationTokenExpiresAt) : null;
  const usedAt = summary?.confirmationTokenUsedAt ? new Date(summary.confirmationTokenUsedAt) : null;

  if (usedAt && !Number.isNaN(usedAt.getTime())) {
    return NextResponse.json({ error: "This link has already been used." }, { status: 409 });
  }

  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 410 });
  }

  const nowIso = new Date().toISOString();

  const decision = parsed.data.decision;
  const isFinalDecision = decision === 'confirmed' || decision === 'declined';

  const updates: any = {
    ...(isFinalDecision
      ? { "stage1.viewingSummary.confirmationTokenUsedAt": nowIso }
      : {}),
    "stage1.viewingSummary.applicantResponse": {
      status: decision,
      respondedAt: nowIso,
      comment: parsed.data.comment,
    },
  };

  // Auto-advance to Stage 2 on confirm (as requested)
  if (decision === "confirmed") {
    updates.currentStage = 2;
    updates.status = "in_progress";
  }

  // If declined, keep stage at 1 but mark as in-progress with response captured.
  if (decision === "declined") {
    updates.currentStage = 1;
    updates.status = "in_progress";
  }

  await applications.updateOne(
    { _id: application._id },
    {
      $set: {
        ...updates,
        updatedAt: nowIso,
      },
    }
  );

  const applicantIdForAudit = (application as any)?.applicantId?.toString?.();
  const actorUserIdForAudit = applicantIdForAudit || String((application as any)?.applicantEmail || "anonymous");

  await auditEvent({
    action: "VIEWING_CONFIRMATION_RECORDED",
    actorUserId: actorUserIdForAudit,
    tenancyApplicationId: String(application._id),
    propertyId: (application as any)?.propertyId?.toString?.(),
    description:
      decision === 'confirmed'
        ? 'Consent to proceed'
        : decision === 'declined'
          ? 'Declined to proceed'
          : 'Query raised',
    metadata: {
      stage: 1,
      decision,
      via: 'magic_link',
    },
  }).catch(() => undefined);

  // Notify landlord (best-effort; do not fail confirmation if notification fails)
  try {
    const landlordIdRaw = (application as any)?.landlordId?.toString?.() ?? String((application as any)?.landlordId ?? "");
    const propertyIdRaw = (application as any)?.propertyId?.toString?.() ?? String((application as any)?.propertyId ?? "");

    const users = await getCollection("users");
    const landlordUser = ObjectId.isValid(landlordIdRaw)
      ? await users.findOne({ _id: new ObjectId(landlordIdRaw) })
      : null;

    const landlordEmail = typeof (landlordUser as any)?.email === "string" ? (landlordUser as any).email : null;
    const landlordPhone =
      (typeof (landlordUser as any)?.tel === "string" ? (landlordUser as any).tel : undefined) ||
      (typeof (landlordUser as any)?.profile?.phone === "string" ? (landlordUser as any).profile.phone : undefined) ||
      (typeof (landlordUser as any)?.phone === "string" ? (landlordUser as any).phone : undefined);

    const prefs =
      cleanPrefs((landlordUser as any)?.profile?.contactPreferences) ||
      cleanPrefs((landlordUser as any)?.contactPreferences) ||
      ({ email: true, sms: false, whatsapp: false } satisfies UserContactPreferences);

    const baseUrl = getBaseUrl();
    const manageLink = `${baseUrl}/landlord/applications/${encodeURIComponent(String(application._id))}`;

    let propertyLabel = "your property";
    if (ObjectId.isValid(propertyIdRaw)) {
      const properties = await getCollection("properties");
      const property = await properties.findOne(
        { _id: new ObjectId(propertyIdRaw) },
        { projection: { title: 1, address: 1 } }
      );

      const title = typeof (property as any)?.title === "string" ? (property as any).title : undefined;
      const address = (property as any)?.address as
        | { line1?: string | null; city?: string | null; postcode?: string | null }
        | null
        | undefined;
      propertyLabel = formatPropertyLabel({ title, address });
    }

    const applicantName = String((application as any)?.applicantName || "");
    const decision = parsed.data.decision;

    const emailTemplate =
      decision === "confirmed"
        ? NotificationTemplates.applicantConfirmedPropertyLandlordEmail(applicantName, propertyLabel, manageLink)
        : decision === "declined"
          ? NotificationTemplates.applicantDeclinedPropertyLandlordEmail(applicantName, propertyLabel, manageLink)
          : NotificationTemplates.applicantQueriedPropertyLandlordEmail(
              applicantName,
              propertyLabel,
              manageLink,
              parsed.data.comment || ""
            );

    const smsTemplate = NotificationTemplates.applicantDecisionLandlordSms(decision, manageLink);

    if (prefs.email && landlordEmail) {
      await notificationService.sendNotification({
        to: landlordEmail,
        subject: emailTemplate.subject,
        message: emailTemplate.message,
        method: "email",
      });
    }

    if (prefs.sms && landlordPhone) {
      await notificationService.sendNotification({
        to: landlordPhone,
        message: smsTemplate.message,
        method: "sms",
      });
    }
  } catch (e) {
    console.error("Failed to notify landlord about applicant decision", e);
  }

  return NextResponse.json({ ok: true });
}
