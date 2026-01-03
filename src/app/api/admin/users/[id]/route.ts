import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { z } from "zod";

/**
 * GET /api/admin/users/[id]
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // ✅ FIX

  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid user ID" },
      { status: 400 }
    );
  }

  const users = await getCollection("users");
  const user = await users.findOne({ _id: new ObjectId(id) });

  console.log("[ADMIN USERS][API] Full user document:", user);

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  const { _id, ...rest } = user;

  return NextResponse.json({
    _id: _id.toString(),
    name: rest.name ?? "",
    email: rest.email ?? "",
    role: rest.role ?? "APPLICANT",
    status: rest.status ?? "ACTIVE",
    description: rest.description ?? "",
    applicationType: rest.applicationType ?? "",
    landlordRegId: rest.landlordRegId ?? "",
    phone: rest.phone ?? rest.profile?.phone ?? null,
    address: rest.address ?? rest.profile?.address ?? null,
    addressVerified: rest.addressVerified ?? null,
    profileCompleteness: rest.profileCompleteness ?? null,
    contactPreferences:
      rest.contactPreferences ??
      rest.profile?.contactPreferences ??
      null,
    createdAt: rest.createdAt?.toISOString?.() ?? null,
    updatedAt: rest.updatedAt?.toISOString?.() ?? null,
  });
}

/**
 * PATCH /api/admin/users/[id]
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // ✅ FIX

  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid user ID" },
      { status: 400 }
    );
  }

  // Admin-only guard
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Zod validation
  const patchUserSchema = z.object({
    role: z.string().min(1),
    status: z.string().min(1),
  });

  let body;
  try {
    body = patchUserSchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const users = await getCollection("users");

  const result = await users.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...body,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  if (!result.value) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  const { _id, ...rest } = result.value;

  return NextResponse.json({
    _id: _id.toString(),
    name: rest.name ?? "",
    email: rest.email ?? "",
    role: rest.role ?? "APPLICANT",
    status: rest.status ?? "ACTIVE",
    description: rest.description ?? "",
    applicationType: rest.applicationType ?? "",
    landlordRegId: rest.landlordRegId ?? "",
    phone: rest.phone ?? rest.profile?.phone ?? null,
    address: rest.address ?? rest.profile?.address ?? null,
    addressVerified: rest.addressVerified ?? null,
    profileCompleteness: rest.profileCompleteness ?? null,
    contactPreferences:
      rest.contactPreferences ??
      rest.profile?.contactPreferences ??
      null,
    createdAt: rest.createdAt?.toISOString?.() ?? null,
    updatedAt: rest.updatedAt?.toISOString?.() ?? null,
  });
}
