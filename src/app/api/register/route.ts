import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import clientPromise from "@/lib/mongodb";

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
    applicationType,
    landlordRegId,
  } = body;
    // Ignore any landlordRegId or role input; always register as APPLICANT

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

  await db.collection("users").insertOne({
    email,
    name,
    hashedPassword,
    role: "APPLICANT",
    applicationType: applicationType || null,
    landlordRegId: applicationType === "landlord" ? landlordRegId || null : null,
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

  // Notify admin by email and SMS
  const adminEmail = process.env.ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL;
  const NotificationService = (await import("@/lib/notification")).NotificationService;
  const notification = NotificationService.getInstance();
  const subject = "New Registration on Rentsimple";
  let message = `A new user has registered.\nName: ${name}\nEmail: ${email}\nPhone: ${phone}`;
  if (applicationType) {
    message += `\nApplication Type: ${applicationType}`;
  }
  if (applicationType === "landlord" && landlordRegId) {
    message += `\nLandlord Registration ID: ${landlordRegId}`;
  }
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
