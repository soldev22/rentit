import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import crypto from "crypto";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { formatPropertyLabel } from "@/lib/formatPropertyLabel";
import { notificationService, type UserContactPreferences } from "@/lib/notification";
import { getTenancyApplicationById, updateTenancyApplication } from "@/lib/tenancy-application";
import { auditEvent } from "@/lib/audit";
import { mirrorCommsToLandlord } from "@/lib/mirrorCommsToLandlord";

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

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000";
}

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
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

export async function POST(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
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

  const alreadySentAt = application.stage1.viewingSummary?.sentToApplicantAt;
  const unlockedForEdit = Boolean(application.stage1.viewingSummary?.editingUnlockedAt);
  if (alreadySentAt && !unlockedForEdit) {
    return NextResponse.json({ error: "Already sent to applicant" }, { status: 409 });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const landlordObjectId = ObjectId.isValid(session.user.id) ? new ObjectId(session.user.id) : undefined;

  const token = randomToken();
  const tokenHash = sha256Hex(token);
  const expiresAtIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Build link for applicant
  const baseUrl = getBaseUrl();
  const confirmLink = `${baseUrl}/viewing/confirm/${encodeURIComponent(token)}`;

  // Property label for email (SMS stays generic for privacy)
  const properties = await getCollection("properties");
  const property = await properties.findOne(
    { _id: new ObjectId(application.propertyId.toString()) },
    { projection: { title: 1, address: 1 } }
  );
  const title = typeof property?.title === "string" ? property.title : undefined;
  const address = property?.address as
    | { line1?: string | null; city?: string | null; postcode?: string | null }
    | null
    | undefined;
  const propertyLabel = formatPropertyLabel({ title, address });

  // Determine applicant contact prefs
  const users = await getCollection("users");
  const user = await users.findOne({ email: String(application.applicantEmail || "").toLowerCase() });

  const prefs =
    cleanPrefs((user as any)?.profile?.contactPreferences) ||
    ({ email: true, sms: false, whatsapp: false } satisfies UserContactPreferences);

  const applicantEmail = String(application.applicantEmail || "").toLowerCase();
  const applicantPhone =
    (typeof (user as any)?.tel === "string" ? (user as any).tel : undefined) ||
    (typeof (user as any)?.profile?.phone === "string" ? (user as any).profile.phone : undefined) ||
    (typeof application.applicantTel === "string" ? application.applicantTel : undefined);

  const emailSubject = "Confirm the property you viewed";
  const emailMessage =
    `Hi ${application.applicantName || ""},\n\n` +
    `Please confirm you’re happy with ${propertyLabel} and want to proceed.\n\n` +
    `Confirm here: ${confirmLink}\n\n` +
    `If you didn’t request this, you can ignore this message.\n\n` +
    `RentIT`;

  const smsMessage =
    `Please confirm you’re happy with the property you viewed. Open: ${confirmLink} - RentIT`;

  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  const smsConfigured = Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER
  );

  const delivery = {
    email: {
      attempted: false,
      sent: false,
      reason: undefined as string | undefined,
    },
    sms: {
      attempted: false,
      sent: false,
      reason: undefined as string | undefined,
    },
  };

  // Email follows applicant preferences.
  if (!prefs.email) {
    delivery.email.attempted = false;
    delivery.email.reason = "Applicant email preferences disabled";
  } else if (!applicantEmail) {
    delivery.email.attempted = false;
    delivery.email.reason = "Missing applicant email";
  } else if (!emailConfigured) {
    delivery.email.attempted = true;
    delivery.email.sent = false;
    delivery.email.reason = "Email not configured (RESEND_API_KEY/RESEND_FROM_EMAIL)";
  } else {
    delivery.email.attempted = true;
    delivery.email.sent = await notificationService.sendNotification({
      to: applicantEmail,
      subject: emailSubject,
      message: emailMessage,
      method: "email",
    });
    if (!delivery.email.sent) delivery.email.reason = "Email send failed";
  }

  // Always attempt SMS when we have a phone number.
  if (!applicantPhone) {
    delivery.sms.attempted = false;
    delivery.sms.reason = "No applicant phone number";
  } else if (!smsConfigured) {
    delivery.sms.attempted = true;
    delivery.sms.sent = false;
    delivery.sms.reason = "SMS not configured (TWILIO_* env vars)";
  } else {
    delivery.sms.attempted = true;
    delivery.sms.sent = await notificationService.sendNotification({
      to: applicantPhone,
      message: smsMessage,
      method: "sms",
    });
    if (!delivery.sms.sent) delivery.sms.reason = "SMS send failed";
  }

  const anyDelivered = Boolean(delivery.email.sent || delivery.sms.sent);
  if (!anyDelivered) {
    await auditEvent({
      action: "VIEWING_CHECKLIST_SENT",
      actorUserId: session.user.id,
      tenancyApplicationId: String(application._id),
      propertyId: application.propertyId.toString(),
      targetUserId: (application as any)?.applicantId?.toString?.(),
      description: "Attempted to send viewing confirmation link (delivery failed)",
      success: false,
      errorCode: "DELIVERY_FAILED",
      errorMessage: "No delivery channels succeeded",
      metadata: {
        stage: 1,
        isResend: Boolean(alreadySentAt),
        delivery,
        emailConfigured,
        smsConfigured,
      },
    }).catch(() => undefined);

    return NextResponse.json(
      {
        error: "Could not deliver the confirmation link (no email/SMS succeeded).",
        delivery,
      },
      { status: 502 }
    );
  }

  // Persist summary + token hash only after delivery succeeded.
  // Also re-lock any landlord unlock used for resending.
  const {
    editingUnlockedAt: _editingUnlockedAt,
    editingUnlockedBy: _editingUnlockedBy,
    ...existingSummary
  } = (application.stage1.viewingSummary ?? {}) as any;

  const nextSummary = {
    ...existingSummary,
    notes: parsed.data.notes ?? application.stage1.viewingSummary?.notes,
    checklist: parsed.data.checklist ?? application.stage1.viewingSummary?.checklist,
    savedAt: nowIso,
    completedBy: landlordObjectId ?? application.stage1.viewingSummary?.completedBy,
    sentToApplicantAt: nowIso,
    confirmationTokenHash: tokenHash,
    confirmationTokenExpiresAt: expiresAtIso,
    confirmationTokenUsedAt: undefined,
    applicantResponse: undefined,
  };

  const ok = await updateTenancyApplication(appId, {
    stage1: {
      ...application.stage1,
      viewingSummary: nextSummary,
    },
  });

  if (!ok) return NextResponse.json({ error: "Failed to save" }, { status: 500 });

  await auditEvent({
    action: "VIEWING_CHECKLIST_SENT",
    actorUserId: session.user.id,
    tenancyApplicationId: String(application._id),
    propertyId: application.propertyId.toString(),
    targetUserId: (application as any)?.applicantId?.toString?.(),
    description: alreadySentAt ? "Resent viewing confirmation link to applicant" : "Sent viewing confirmation link to applicant",
    success: true,
    metadata: {
      stage: 1,
      isResend: Boolean(alreadySentAt),
      delivery,
      emailConfigured,
      smsConfigured,
    },
  }).catch(() => undefined);

  // Mirror comms to landlord (receipt). Do NOT include the applicant magic link.
  await mirrorCommsToLandlord({
    landlordUserId: session.user.id,
    subject: alreadySentAt
      ? `Resent viewing confirmation link to ${application.applicantName || "applicant"} (${propertyLabel})`
      : `Sent viewing confirmation link to ${application.applicantName || "applicant"} (${propertyLabel})`,
    message:
      `This is a copy for your records.\n\n` +
      `Applicant: ${application.applicantName || ""} <${applicantEmail}>\n` +
      (applicantPhone ? `Applicant phone: ${applicantPhone}\n` : "") +
      `Property: ${propertyLabel}\n` +
      `Sent at: ${nowIso}\n` +
      `Expires: ${expiresAtIso}\n\n` +
      `Delivery: SMS=${delivery.sms.sent ? "sent" : "not sent"}, Email=${delivery.email.sent ? "sent" : "not sent"}.\n\n` +
      `Note: Applicant receives a secure confirmation link (not included here).`,
    smsMessage:
      `${alreadySentAt ? "Resent" : "Sent"} viewing confirmation link to ${application.applicantName || "applicant"}. ` +
      `Delivery: SMS=${delivery.sms.sent ? "sent" : "not sent"}, Email=${delivery.email.sent ? "sent" : "not sent"}.`,
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, delivery });
}
