import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import crypto from "crypto";

// POST: { token: string }
export async function POST(req: Request) {
  const { token } = await req.json();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  const client = await clientPromise;
  const db = client.db();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const magic = await db.collection("password_resets").findOne({
    tokenHash,
    used: { $ne: true },
    expiresAt: { $gt: new Date() },
    type: "magic-link",
  });
  if (!magic) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }
  // Invalidate token immediately
  await db.collection("password_resets").updateOne(
    { _id: magic._id },
    { $set: { used: true } }
  );
  // Return the user's email for NextAuth signIn
  return NextResponse.json({ email: magic.email, userId: magic.userId });
}
