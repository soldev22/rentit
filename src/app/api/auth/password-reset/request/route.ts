import { NextResponse } from "next/server";
import crypto from "crypto";
import clientPromise from "@/lib/mongodb";
import { sendPasswordResetEmail } from "@/lib/email";
import { auditEvent } from "@/lib/audit";

// POST: { email: string }
export async function POST(req: Request) {
  const { email } = await req.json();

  // Always respond OK to prevent email enumeration
  if (!email) {
    return NextResponse.json({ ok: true });
  }

  const client = await clientPromise;
  const db = client.db();

  const user = await db.collection("users").findOne({ email });
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  // Generate secure random token
  const rawToken = crypto.randomBytes(32).toString("hex");

  // Hash token before storing
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

  await db.collection("password_resets").insertOne({
    userId: user._id.toString(),
    tokenHash,
    expiresAt,
    createdAt: new Date(),
  });

  await auditEvent({
    action: "PASSWORD_RESET_REQUESTED",
    actorUserId: user._id.toString(),
    description: "Password reset requested",
  });

  await sendPasswordResetEmail({ to: user.email, token: rawToken });

  return NextResponse.json({ ok: true });
}
