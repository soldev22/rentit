import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcrypt";

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
  const reset = await db.collection("passwordResets").findOne({ token, used: false, expires: { $gt: new Date() } });
  if (!reset) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  // Update user password
  const hashedPassword = await bcrypt.hash(password, 10);
  await db.collection("users").updateOne(
    { _id: reset.userId },
    { $set: { hashedPassword } }
  );

  // Mark token as used
  await db.collection("passwordResets").updateOne(
    { _id: reset._id },
    { $set: { used: true } }
  );

  return NextResponse.json({ ok: true });
}
