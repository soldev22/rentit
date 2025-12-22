import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";

/**
 * GET /api/admin/users/[id]
 * Fetch a single user for admin edit modal
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const users = await getCollection("users");

  const user = await users.findOne({ _id: new ObjectId(id) });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Return all user document properties, converting _id to string
  const { _id, ...rest } = user;
  return NextResponse.json({
    _id: _id.toString(),
    ...rest
  });
}

/**
 * PATCH /api/admin/users/[id]
 * Update a user from admin edit modal
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
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
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
