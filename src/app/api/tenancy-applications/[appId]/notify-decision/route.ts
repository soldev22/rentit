import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withApiAudit } from "@/lib/api/withApiAudit";
import { getCollection } from "@/lib/db";
import { NotificationTemplates } from "@/lib/notification-templates";
import { notificationService } from "@/lib/notification";
import { getTenancyApplicationById, updateTenancyApplication } from "@/lib/tenancy-application";
import { z } from "zod";

const NotifyDecisionBodySchema = z
  .object({
    subject: z.string().trim().min(1).max(200).optional(),
    message: z.string().trim().min(1).max(8000).optional(),
    smsMessage: z.string().trim().min(1).max(500).optional(),
    sendSms: z.boolean().optional(),
  })
  .strict();

function normalizePhoneToE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const cleaned = trimmed.replace(/\(0\)/g, "").replace(/[^\d+]/g, "");

  let e164 = cleaned;
  if (e164.startsWith("00")) e164 = "+" + e164.slice(2);

  if (!e164.startsWith("+")) {
    if (e164.startsWith("0")) {
      e164 = "+44" + e164.slice(1);
    } else if (e164.startsWith("44")) {
      e164 = "+" + e164;
    } else {
      e164 = "+" + e164;
    }
  }

  if (!/^\+\d{8,15}$/.test(e164)) return null;
  return e164;
}

async function notifyDecision(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "LANDLORD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appId } = await context.params;
  if (!ObjectId.isValid(appId)) {
    return NextResponse.json({ error: "Invalid application ID" }, { status: 400 });
  }

  const application = await getTenancyApplicationById(appId);
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (application.landlordId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const decision = application.stage2?.landlordDecision?.status ?? "pending";
  if (decision === "pending") {
    return NextResponse.json(
      { error: "Set a landlord decision (PASS/FAIL) before notifying applicants." },
      { status: 400 }
    );
  }

  type PropertyDoc = { title?: string };
  const properties = await getCollection<PropertyDoc>("properties");
  const property = await properties.findOne({ _id: application.propertyId });
  const propertyTitle = property?.title || "your property";

  const template =
    decision === "pass"
      ? NotificationTemplates.backgroundChecksApproved(propertyTitle)
      : NotificationTemplates.backgroundChecksDeclined(propertyTitle);

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000";
  const dashboardLink = `${baseUrl}/applicant/dashboard`;

  const notes = application.stage2?.landlordDecision?.notes;
  const notesLine = notes ? `\n\nLandlord notes: ${notes}` : "";

  const body = await req.json().catch(() => null);
  const parsedBody = body ? NotifyDecisionBodySchema.safeParse(body) : null;
  if (parsedBody && !parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsedBody.error.flatten() },
      { status: 400 }
    );
  }
  const overrides = parsedBody?.success ? parsedBody.data : undefined;
  const sendSms = overrides?.sendSms ?? true;

  const chosenSubject = overrides?.subject || template.subject;
  const baseMessage = overrides?.message || template.message;

  const ensureDashboardLink = baseMessage.includes(dashboardLink)
    ? ""
    : `\n\nYou can view your application status here: ${dashboardLink}`;
  const ensureNotes = notesLine && !baseMessage.includes(notesLine.trim()) ? notesLine : "";

  const message = `${baseMessage}${ensureDashboardLink}${ensureNotes}`;
  const smsMessage =
    overrides?.smsMessage || `${template.message} (See dashboard: ${dashboardLink})`;

  const results = {
    primary: { email: false, sms: false },
    coTenant: { email: false, sms: false },
  };

  // Primary
  if (application.applicantEmail) {
    results.primary.email = await notificationService.sendNotification({
      to: application.applicantEmail,
      subject: chosenSubject,
      message,
      method: "email",
    });
  }

  if (sendSms && application.applicantTel) {
    const smsTo = normalizePhoneToE164(application.applicantTel) ?? application.applicantTel;
    results.primary.sms = await notificationService.sendNotification({
      to: smsTo,
      message: smsMessage,
      method: "sms",
    });
  }

  // Co-tenant
  if (application.coTenant?.email) {
    results.coTenant.email = await notificationService.sendNotification({
      to: application.coTenant.email,
      subject: chosenSubject,
      message,
      method: "email",
    });
  }

  if (sendSms && application.coTenant?.tel) {
    const smsTo = normalizePhoneToE164(application.coTenant.tel) ?? application.coTenant.tel;
    results.coTenant.sms = await notificationService.sendNotification({
      to: smsTo,
      message: smsMessage,
      method: "sms",
    });
  }

  const notifiedAt = new Date().toISOString();

  const shouldAdvanceToStage3 = decision === "pass";
  const nextCurrentStage = shouldAdvanceToStage3 ? (application.currentStage >= 3 ? application.currentStage : 3) : application.currentStage;
  const nextStage2Status = shouldAdvanceToStage3 ? "complete" : application.stage2.status;

  await updateTenancyApplication(appId, {
    stage2: {
      ...application.stage2,
      status: nextStage2Status,
      landlordDecision: {
        ...(application.stage2.landlordDecision ?? { status: decision }),
        notifiedAt,
        notifiedContent: {
          subject: chosenSubject,
          message,
          smsMessage: sendSms ? smsMessage : undefined,
          sendSms,
        },
        notifiedTo: {
          primaryEmail: application.applicantEmail || undefined,
          primarySms: application.applicantTel || undefined,
          coTenantEmail: application.coTenant?.email || undefined,
          coTenantSms: application.coTenant?.tel || undefined,
        },
      },
    },
    ...(shouldAdvanceToStage3 ? { currentStage: nextCurrentStage as 1 | 2 | 3 | 4 | 5 | 6 } : null),
  });

  return NextResponse.json({ ok: true, decision, results, notifiedAt });
}

export const POST = withApiAudit(notifyDecision, {
  action: "COMMUNICATION_SENT",
  description: () => "Sent tenancy application decision letter to applicant(s)",
});
