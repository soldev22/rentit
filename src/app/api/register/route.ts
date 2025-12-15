import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import clientPromise from "@/lib/mongodb";
import { auditEvent } from "@/lib/audit";

type RoleType = "APPLICANT" | "TENANT" | "LANDLORD" | "TRADESPERSON" | "ACCOUNTANT";

export async function POST(req: Request) {
  const body = await req.json();

  const { email, password, name, role } = body as {
    email?: string;
    password?: string;
    name?: string;
    role?: "APPLICANT" | "TENANT" | "LANDLORD" | "TRADESPERSON" | "ACCOUNTANT";
  };

  // Core identity validation
  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Decide role:
  // - If role is one of the allowed, use it, otherwise default to APPLICANT
  const allowedRoles: RoleType[] = ["APPLICANT", "TENANT", "LANDLORD", "TRADESPERSON", "ACCOUNTANT"];
  const assignedRole: RoleType = allowedRoles.includes(role as RoleType)
    ? (role as RoleType)
    : "APPLICANT";

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
