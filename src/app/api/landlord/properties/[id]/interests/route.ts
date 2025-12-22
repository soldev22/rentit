import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function DELETE(
  req: Request,
  context: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  // 1. Auth guard
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "LANDLORD") {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  let propertyId: string;
  if (typeof (context.params as any).then === 'function') {
    // params is a Promise
    propertyId = (await (context.params as Promise<{ id: string }>)).id;
  } else {
    propertyId = (context.params as { id: string }).id;
  }
  const collection = await getCollection("properties");
  const filter = {
    _id: new ObjectId(propertyId),
    $or: [
      { landlordId: new ObjectId(session.user.id) },
      { landlordId: session.user.id },
    ],
  };

  // Remove all interests from the property
  const result = await collection.updateOne(filter, { $set: { interests: [] } });
  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Property not found or not owned by user" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
