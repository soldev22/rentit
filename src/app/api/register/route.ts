import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import clientPromise from "@/lib/mongodb";
import { auditEvent } from "@/lib/audit";

export async function POST(req: Request) {
  const body = await req.json();

  const {
    email,
    password,
    name,
    phone,
    addressLine1,
    addressLine2,
    city,
    postcode,
  } = body;
  // Ignore any role/application type input; always register as APPLICANT

  if (!email || !password || !name || !phone) {
    return NextResponse.json(
      { error: "Missing required fields (name, email, password, phone)" },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db();

  const existingUser = await db
    .collection("users")
    .findOne({ email });

  if (existingUser) {
    return NextResponse.json(
      { error: "User already exists" },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const insertResult = await db.collection("users").insertOne({
    email,
    name,
    hashedPassword,
    role: "APPLICANT",
    applicationType: "applicant",
    landlordRegId: null,
    profile: {
      phone: phone || null,
      address: {
        line1: addressLine1 || null,
        line2: addressLine2 || null,
        city: city || null,
        postcode: postcode || null,
      },
      contactPreferences: {
        email: true, // Default to email enabled
        sms: false,
        whatsapp: false,
      },
    },
    createdAt: new Date(),
  });

  await auditEvent({
    action: "USER_REGISTERED",
    actorUserId: insertResult.insertedId.toString(),
    description: "User registered",
    source: "/api/register",
    metadata: {
      email,
      role: "APPLICANT",
    },
  }).catch(() => undefined);

  // Notify admin by email and SMS
  const adminEmail = process.env.ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL;
  const NotificationService = (await import("@/lib/notification")).NotificationService;
  const notification = NotificationService.getInstance();
  const subject = "New Registration on Rentsimple";
  const message = `A new user has registered.\nName: ${name}\nEmail: ${email}\nPhone: ${phone}`;
  // Send email only (Resend)
  if (adminEmail) {
    await notification.sendNotification({
      to: adminEmail,
      subject,
      message,
      method: "email",
    });
  }

  return NextResponse.json({ success: true });
}
