import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import clientPromise from "@/lib/mongodb";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  tel: z.string().min(6),
  password: z.string().min(6),
  role: z.enum(["RENTER", "LANDLORD"])
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { name, email, tel, password, role } = parsed.data;
    const client = await clientPromise;
    const db = client.db();
    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      name,
      email,
      tel,
      hashedPassword,
      role,
      createdAt: new Date()
    };
    const result = await db.collection("users").insertOne(user);
    if (!result.acknowledged) {
      console.error("MongoDB insert not acknowledged", result);
      return NextResponse.json({ error: "Database insert failed" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Server error", details: String(err) }, { status: 500 });
  }
}
