import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import clientPromise from "@/lib/mongodb";
import { auditEvent } from "@/lib/audit";

type RoleType = "APPLICANT" | "TENANT" | "LANDLORD" | "TRADESPERSON" | "ACCOUNTANT" | "AGENT";

export async function POST(req: Request) {
  const body = await req.json();

  // Block any client-supplied role
  if ("role" in body) {
    return NextResponse.json(
      { error: "Role assignment not allowed" },
      { status: 400 }
    );
  }

  const { email, password, name } = body as {
    email?: string;
    password?: string;
    name?: string;
  };

  // Core identity validation
  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Always assign safe default role
  const assignedRole: RoleType = "APPLICANT";

  const client = await clientPromise;
  const db = client.db();

  const existingUser = await db.collection("users").findOne({ email });
  if (existingUser) {
    return NextResponse.json(
      { error: "User already exists" },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const userResult = await db.collection("users").insertOne({
    email,
    name,
    hashedPassword,
    role: assignedRole,
    createdAt: new Date(),
  });

  const userId = userResult.insertedId.toString();

  await db.collection("roles").insertOne({
    userId,
    role: assignedRole,
    createdAt: new Date(),
  });

  await auditEvent({
    action: "USER_REGISTERED",
    actorUserId: userId,
    targetUserId: userId,
    description: `User registered as ${assignedRole}`,
    metadata: { role: assignedRole },
  });

  return NextResponse.json({ ok: true });
}
