import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  // 1. Auth guard
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "LANDLORD") {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: propertyId } = await context.params;

  // 2. Parse body
  const body = await req.json();
  const { title, status, rentPcm, address } = body;

  // 3. Update DB
  const collection = await getCollection("properties");

  // NOTE: Check your DB: landlordId may be ObjectId or string. Adjust as needed.
  const filter = {
    _id: new ObjectId(propertyId),
    $or: [
      { landlordId: new ObjectId(session.user.id) },
      { landlordId: session.user.id }, // legacy
    ],
  };
  const update = {
    $set: {
      title,
      status,
      rentPcm,
      "address.line1": address?.line1 ?? "",
      "address.city": address?.city ?? "",
      "address.postcode": address?.postcode ?? "",
      updatedAt: new Date(),
    },
  };
  // Debug: log filter and session
   const result = await collection.updateOne(filter, update);
  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Property not found or not owned by user" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
