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
  } = body;

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "Missing required fields" },
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
    profile: {
      phone: phone || null,
      address: {
        line1: addressLine1 || null,
        line2: addressLine2 || null,
        city: city || null,
        postcode: postcode || null,
      },
    },
    createdAt: new Date(),
  });

  return NextResponse.json({ success: true });
}
