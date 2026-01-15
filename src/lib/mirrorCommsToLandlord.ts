import { ObjectId } from "mongodb";

import { getCollection } from "@/lib/db";
import { notificationService } from "@/lib/notification";

function redactUrls(text: string): string {
  return text.replace(/https?:\/\/\S+/gi, "[link omitted]");
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

async function getLandlordContact(landlordUserId: string): Promise<{ email?: string; phone?: string } | null> {
  const users = await getCollection("users");

  const user = ObjectId.isValid(landlordUserId)
    ? await users.findOne({ _id: new ObjectId(landlordUserId) })
    : await users.findOne({ _id: landlordUserId as any });

  if (!user) return null;

  const email = typeof (user as any)?.email === "string" ? (user as any).email : undefined;
  const phoneRaw =
    (typeof (user as any)?.tel === "string" ? (user as any).tel : undefined) ||
    (typeof (user as any)?.profile?.phone === "string" ? (user as any).profile.phone : undefined) ||
    (typeof (user as any)?.phone === "string" ? (user as any).phone : undefined);

  const phone = phoneRaw ? normalizePhoneToE164(phoneRaw) ?? phoneRaw : undefined;

  if (!email && !phone) return null;
  return { email, phone };
}

export async function mirrorCommsToLandlord(input: {
  landlordUserId: string;
  subject: string;
  message: string;
  smsMessage?: string;
}): Promise<{ email: boolean; sms: boolean }> {
  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  const smsConfigured = Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER
  );

  const contact = await getLandlordContact(input.landlordUserId);
  if (!contact) return { email: false, sms: false };

  const results = { email: false, sms: false };

  const redactedMessage = redactUrls(input.message);
  const redactedSms = input.smsMessage ? redactUrls(input.smsMessage) : undefined;

  if (emailConfigured && contact.email) {
    results.email = await notificationService
      .sendNotification({
        to: contact.email,
        subject: input.subject,
        message: redactedMessage,
        method: "email",
      })
      .catch(() => false);
  }

  if (smsConfigured && contact.phone && redactedSms) {
    results.sms = await notificationService
      .sendNotification({
        to: contact.phone,
        message: redactedSms,
        method: "sms",
      })
      .catch(() => false);
  }

  return results;
}
