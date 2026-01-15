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

  // Persist summary + token hash before sending
  const nextSummary = {
    ...(application.stage1.viewingSummary ?? {}),
    notes: parsed.data.notes ?? application.stage1.viewingSummary?.notes,
    checklist: parsed.data.checklist ?? application.stage1.viewingSummary?.checklist,
    savedAt: nowIso,
    completedAt: nowIso,
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

  const notification = {
    email: false,
    sms: false,
    whatsapp: false,
  };

  if (prefs.email) {
    notification.email = await notificationService.sendNotification({
      to: applicantEmail,
      subject: emailSubject,
      message: emailMessage,
      method: "email",
    });
  }

  if (prefs.sms && applicantPhone) {
    notification.sms = await notificationService.sendNotification({
      to: applicantPhone,
      message: smsMessage,
      method: "sms",
    });
  }

  return NextResponse.json({ ok: true, notification });
}
