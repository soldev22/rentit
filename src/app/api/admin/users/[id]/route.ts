import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";

/**
 * GET /api/admin/users/[id]
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid user ID" },
      { status: 400 }
    );
  }

  const users = await getCollection("users");

  const user = await users.findOne({ _id: new ObjectId(id) });
  console.log('[ADMIN USERS][API] Full user document:', user);

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
    contactPreferences: rest.contactPreferences ?? rest.profile?.contactPreferences ?? null,
    createdAt: rest.createdAt?.toISOString?.() ?? null,
    updatedAt: rest.updatedAt?.toISOString?.() ?? null,
  });
}

/**
 * PATCH /api/admin/users/[id]
 */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid user ID" },
      { status: 400 }
    );
  }

  // Check session and admin role
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("next-auth.session-token")?.value;
  if (!sessionToken) {
    return NextResponse.json(
      { error: "Unauthorized: No session token" },
      { status: 401 }
    );
  }
  // Validate session and role
  const client = await clientPromise;
  const db = client.db();
  const session = await db.collection("sessions").findOne({ sessionToken });
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid session" },
      { status: 401 }
    );
  }
  const user = await db.collection("users").findOne({ _id: session.userId });
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admins only" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const users = await getCollection("users");

  const result = await users.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...body,
        updatedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
