import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { notificationService } from "@/lib/notification";
import { auditEvent } from "@/lib/audit";
import { getActiveLetterTemplateText } from "@/lib/templates/getActiveLetterTemplateText";
import { formatPropertyLabel } from "@/lib/formatPropertyLabel";

const BodySchema = z.object({
  subject: z.string().trim().min(1).max(200),
  content: z.string().min(1).max(20000),
});

function applyTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

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

async function loadApplicationForLandlord(appId: string, landlordUserId: string) {
  const applications = await getCollection("tenancy_applications");
  const application = await applications.findOne({ _id: new ObjectId(appId) });
  if (!application) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };

  const landlordId = (application as any)?.landlordId?.toString?.() ?? String((application as any)?.landlordId ?? "");
  if (!landlordId || landlordId !== landlordUserId) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  return { applications, application };
}

export async function GET(_req: NextRequest, context: { params: Promise<{ appId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "LANDLORD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { appId } = await context.params;
  if (!ObjectId.isValid(appId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const loaded = await loadApplicationForLandlord(appId, session.user.id);
  if ("error" in loaded) return loaded.error;

  const letter = (loaded.application as any)?.stage2?.proceedLetter ?? null;
  return NextResponse.json({ ok: true, letter });
}

export async function PUT(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "LANDLORD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { appId } = await context.params;
  if (!ObjectId.isValid(appId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const loaded = await loadApplicationForLandlord(appId, session.user.id);
  if ("error" in loaded) return loaded.error;

  const now = new Date().toISOString();

  await loaded.applications.updateOne(
    { _id: new ObjectId(appId) },
    {
      $set: {
        "stage2.proceedLetter": {
          ...(loaded.application as any)?.stage2?.proceedLetter,
          subject: parsed.data.subject,
          content: parsed.data.content,
          savedAt: now,
        },
        updatedAt: now,
      },
    }
  );

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "LANDLORD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { appId } = await context.params;
  if (!ObjectId.isValid(appId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const loaded = await loadApplicationForLandlord(appId, session.user.id);
  if ("error" in loaded) return loaded.error;

  const application: any = loaded.application;

  const consentStatus = application?.stage1?.viewingSummary?.applicantResponse?.status;
  if (consentStatus !== "confirmed") {
    return NextResponse.json({ error: "Consent to proceed is required before sending this letter." }, { status: 409 });
  }

  const existingSentAt = application?.stage2?.proceedLetter?.sentAt;
  if (existingSentAt) {
    return NextResponse.json({ error: "This letter has already been sent." }, { status: 409 });
  }

  const applicantEmail = String(application?.applicantEmail || "").trim();
  if (!applicantEmail) return NextResponse.json({ error: "Applicant email is missing" }, { status: 400 });

  const now = new Date().toISOString();

  const emailOk = await notificationService
    .sendNotification({
      to: applicantEmail,
      subject: parsed.data.subject,
      message: parsed.data.content,
      method: "email",
    })
    .catch(() => false);

  if (!emailOk) {
    return NextResponse.json(
      {
        error: "Email failed to send",
        delivery: {
          email: { attempted: true, ok: false, reason: "provider_failed" },
          sms: { attempted: false, ok: false, reason: "email_failed" },
        },
      },
      { status: 502 }
    );
  }

  const applicantTelRaw = String(application?.applicantTel || "").trim();
  const smsTo = applicantTelRaw ? normalizePhoneToE164(applicantTelRaw) ?? applicantTelRaw : null;

  const smsAttempted = Boolean(smsTo);

  // Build privacy-safe variables for optional SMS template
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000";
  const dashboardLink = `${baseUrl}/applicant/dashboard`;

  let propertyLabel = "the property";
  try {
    const rawPropertyId = String(application?.propertyId || "");
    if (ObjectId.isValid(rawPropertyId)) {
      const properties = await getCollection("properties");
      const property = await properties.findOne(
        { _id: new ObjectId(rawPropertyId) },
        { projection: { title: 1, address: 1 } }
      );

      const title = typeof (property as any)?.title === "string" ? (property as any).title : undefined;
      const address = (property as any)?.address as
        | { line1?: string | null; city?: string | null; postcode?: string | null }
        | null
        | undefined;
      propertyLabel = formatPropertyLabel({ title, address }) || propertyLabel;
    }
  } catch {
    // best-effort only
  }

  const smsTemplateText = await getActiveLetterTemplateText({ kind: "TENANCY_PROCEED_LETTER", channel: "sms" });
  const smsMessage = smsTemplateText
    ? applyTemplate(smsTemplateText, {
        APPLICANT_NAME: String(application?.applicantName || "Applicant"),
        PROPERTY_LABEL: propertyLabel,
        DASHBOARD_LINK: dashboardLink,
      })
    : "RentIT: We’ve emailed you a letter confirming the next stage of your tenancy application. Please check your inbox.";

  const smsOk = smsTo
    ? await notificationService
        .sendNotification({
          to: smsTo,
          message: smsMessage,
          method: "sms",
        })
        .catch(() => false)
    : false;

  await loaded.applications.updateOne(
    { _id: new ObjectId(appId) },
    {
      $set: {
        "stage2.proceedLetter": {
          ...(application?.stage2?.proceedLetter ?? {}),
          subject: parsed.data.subject,
          content: parsed.data.content,
          savedAt: application?.stage2?.proceedLetter?.savedAt ?? now,
          sentAt: now,
          sentBy: ObjectId.isValid(session.user.id) ? new ObjectId(session.user.id) : session.user.id,
          sentToEmail: applicantEmail,
          sentToSms: smsTo,
          delivery: {
            email: true,
            sms: smsOk,
          },
        },
        updatedAt: now,
      },
    }
  );

  await auditEvent({
    action: "TENANCY_PROCEED_LETTER_SENT",
    actorUserId: session.user.id,
    tenancyApplicationId: String(application?._id),
    propertyId: String(application?.propertyId),
    targetUserId: application?.applicantId?.toString?.() ?? undefined,
    description: "Tenancy proceed letter sent",
    metadata: {
      stage: 1,
      subject: parsed.data.subject,
      delivery: {
        email: true,
        sms: smsAttempted ? smsOk : null,
      },
    },
  }).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    sentAt: now,
    delivery: {
      email: { attempted: true, ok: true },
      sms: smsAttempted
        ? { attempted: true, ok: smsOk, ...(smsOk ? {} : { reason: "sms_failed_or_not_configured" }) }
        : { attempted: false, ok: false, reason: "no_phone" },
    },
  });
}
