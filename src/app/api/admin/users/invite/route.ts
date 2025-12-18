import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { randomBytes } from "crypto";
import { getCollection } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { email, name, role } = await req.json();

  if (!email || !role) {
    return NextResponse.json(
      { error: "Missing email or role" },
      { status: 400 }
    );
  }

  const users = await getCollection("users");

  const existing = await users.findOne({ email });
  if (existing) {
    return NextResponse.json(
      { error: "User already exists or invited" },
      { status: 409 }
    );
  }

  const resetToken = randomBytes(32).toString("hex");
  const resetTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await users.insertOne({
    email,
    name,
    role,
    status: "INVITED",
    resetToken,
    resetTokenExpiresAt,
    tokenType: "INVITE",
    createdAt: new Date(),
    invitedBy: session.user.id,
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL;

  const inviteUrl = `${baseUrl}/password-reset/confirm?token=${resetToken}`;

  await sendPasswordResetEmail({
    to: email,
    token: resetToken,
    subject: "You’ve been invited to RentIT",
    html: `
      <p>You’ve been invited to access RentIT.</p>
      <p><a href="${inviteUrl}">Set your password</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });

  return NextResponse.json({ ok: true });
}
