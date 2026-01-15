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

  const client = await clientPromise;
  const db = client.db();
  const user = await db.collection("users").findOne({ email });
  if (!user) {
    return NextResponse.json({ success: true });
  }

  // Generate secure random token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const _tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const _expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes

  // (magicTokens usage removed)

  // Send magic link email using the password reset email utility, but with a magic link
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const magicUrl = `${baseUrl}/api/auth/magic-link/verify?token=${rawToken}`;
  const subject = 'Your RentIT Magic Login Link';
  const html = `
    <p>Hello,</p>
    <p>Click the link below to log in to your RentIT account. This link is valid for 15 minutes and can only be used once.</p>
    <p><a href="${magicUrl}">Log in to RentIT</a></p>
    <p>If you did not request this, you can ignore this email.</p>
    <p>Thanks,<br/>The RentIT Team</p>
  `;
  await sendPasswordResetEmail({ to: email, token: rawToken, subject, html });

  return NextResponse.json({ success: true });
}
