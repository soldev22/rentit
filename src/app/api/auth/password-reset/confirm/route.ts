import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { ObjectId } from "mongodb";

// POST: { token: string, password: string }
export async function POST(req: Request) {
  const { token, password } = await req.json();
  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db();

  // Hash the incoming token to match stored tokenHash
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // Find the reset record in the correct collection and with correct fields
  const reset = await db.collection("password_resets").findOne({
    tokenHash,
    used: { $ne: true },
    expiresAt: { $gt: new Date() },
  });
  if (!reset) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  // Update user password (userId is stored as string)
  const hashedPassword = await bcrypt.hash(password, 10);
  await db.collection("users").updateOne(
    { _id: new ObjectId(reset.userId) },
    { $set: { hashedPassword } }
  );

  // Mark token as used
  await db.collection("password_resets").updateOne(
    { _id: reset._id },
    { $set: { used: true } }
  );

  return NextResponse.json({ ok: true });
}
