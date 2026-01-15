import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { withApiAudit } from "@/lib/api/withApiAudit";
import { notificationService } from "@/lib/notification";
import { addDelivery, addMessage, getOrCreateDirectThread, type CommsKind } from "@/lib/comms";

const sendSchema = z.object({
  recipientUserId: z.string().min(1),
  subject: z.string().min(1).max(160).optional(),
  body: z.string().min(1).max(5000),
  kind: z.enum(["adhoc", "legal", "maintenance"]).default("adhoc"),
});

async function sendAdminMessage(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = sendSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!ObjectId.isValid(parsed.recipientUserId)) {
    return NextResponse.json({ error: "Invalid recipient user ID" }, { status: 400 });
  }

  if (!session.user.id || !ObjectId.isValid(session.user.id)) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const senderUserId = new ObjectId(session.user.id);
  const recipientUserId = new ObjectId(parsed.recipientUserId);

  const users = await getCollection("users");

  const recipient = await users.findOne(
    { _id: recipientUserId },
    { projection: { email: 1, role: 1, profile: 1, phone: 1, commsEnabled: 1, name: 1 } }
  );

  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  const commsEnabled = typeof (recipient as any).commsEnabled === "boolean" ? (recipient as any).commsEnabled : true;
  if (!commsEnabled) {
    return NextResponse.json({ error: "Communications are disabled for this user" }, { status: 400 });
  }

  const recipientEmail = (recipient as any).email as string | undefined;
  const recipientPhone =
    ((recipient as any).phone as string | undefined) ||
    ((recipient as any).profile?.phone as string | undefined);

  const contactPrefs = (recipient as any).profile?.contactPreferences as
    | { email?: boolean; sms?: boolean; whatsapp?: boolean }
    | undefined;

  const emailOptIn = contactPrefs?.email ?? true;
  const smsOptIn = contactPrefs?.sms ?? false;

  const kind = parsed.kind as CommsKind;

  const thread = await getOrCreateDirectThread({
    sender: {
      userId: senderUserId,
      role: session.user.role,
      email: session.user.email ?? undefined,
    },
    recipient: {
      userId: recipientUserId,
      role: (recipient as any).role,
      email: recipientEmail,
      phone: recipientPhone,
    },
    kind,
    subject: parsed.subject,
  });

  const message = await addMessage({
    threadId: thread._id!,
    senderUserId,
    senderRole: session.user.role,
    subject: parsed.subject,
    body: parsed.body,
    kind,
  });

  const subject = parsed.subject ?? "New message";

  const emailProvider: "resend" | "simulated" = process.env.RESEND_API_KEY ? "resend" : "simulated";
  const smsProvider: "twilio" | "not_configured" =
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? "twilio" : "not_configured";

  // Email
  const emailDelivery = {
    messageId: message._id!,
    threadId: thread._id!,
    userId: recipientUserId,
    channel: "email" as const,
    to: recipientEmail,
    provider: emailProvider,
    status: "queued" as const,
    attemptedAt: new Date(),
  };

  if (!recipientEmail) {
    await addDelivery({
      ...emailDelivery,
      status: "skipped_missing_destination",
      error: "Missing recipient email",
    });
  } else if (!emailOptIn) {
    await addDelivery({
      ...emailDelivery,
      status: "skipped_no_opt_in",
      error: "User not opted-in to email",
    });
  } else {
    const ok = await notificationService.sendNotification({
      to: recipientEmail,
      subject,
      message: parsed.body,
      method: "email",
    });

    await addDelivery({
      ...emailDelivery,
      status: ok ? "sent" : "failed",
      error: ok ? undefined : "Email send failed",
      updatedAt: new Date(),
    });
  }

  // SMS
  const smsDelivery = {
    messageId: message._id!,
    threadId: thread._id!,
    userId: recipientUserId,
    channel: "sms" as const,
    to: recipientPhone,
    provider: smsProvider,
    status: "queued" as const,
    attemptedAt: new Date(),
  };

  if (!recipientPhone) {
    await addDelivery({
      ...smsDelivery,
      status: "skipped_missing_destination",
      error: "Missing recipient phone",
    });
  } else if (!smsOptIn) {
    await addDelivery({
      ...smsDelivery,
      status: "skipped_no_opt_in",
      error: "User not opted-in to SMS",
    });
  } else {
    const ok = await notificationService.sendNotification({
      to: recipientPhone,
      message: parsed.body,
      method: "sms",
    });

    await addDelivery({
      ...smsDelivery,
      status: ok ? "sent" : "failed",
      error: ok ? undefined : "SMS send failed",
      updatedAt: new Date(),
    });
  }

  return NextResponse.json({
    ok: true,
    threadId: thread._id?.toString(),
    messageId: message._id?.toString(),
  });
}

export const POST = withApiAudit(sendAdminMessage, {
  action: "COMMUNICATION_SENT",
  description: () => "Sent message to user",
});
