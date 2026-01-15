import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

// POST: { email: string }
export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ success: true }); // Always return success for privacy
  }

  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!normalizedEmail) {
    return NextResponse.json({ success: true });
  }

  const client = await clientPromise;
  const db = client.db();
  const user = await db
    .collection("users")
    .findOne({ email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i") });
  if (!user) {
    return NextResponse.json({ success: true });
  }

  // Generate secure random token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes

  await db.collection("password_resets").insertOne({
    type: "magic-link",
    email: user.email,
    userId: user._id?.toString?.() ?? null,
    tokenHash,
    expiresAt,
    used: false,
    createdAt: new Date(),
  });

  const origin = (() => {
    try {
      return new URL(req.url).origin;
    } catch {
      return null;
    }
  })();
  const baseUrl =
    origin ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const magicUrl = `${baseUrl}/magic-link/callback?token=${rawToken}`;
  const subject = 'Your RentIT Magic Login Link';
  const html = `
    <p>Hello,</p>
    <p>Click the link below to log in to your RentIT account. This link is valid for 15 minutes and can only be used once.</p>
    <p><a href="${magicUrl}">Log in to RentIT</a></p>
    <p>If you did not request this, you can ignore this email.</p>
    <p>Thanks,<br/>The RentIT Team</p>
  `;
  await sendPasswordResetEmail({ to: user.email, token: rawToken, subject, html });

  return NextResponse.json({ success: true });
}
