
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import { deleteBlobs } from "@/lib/azureBlob";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  // 1. Auth guard
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "LANDLORD") {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: propertyId } = await context.params;
  const collection = await getCollection("properties");
  const filter = {
    _id: new ObjectId(propertyId),
    $or: [
      { landlordId: new ObjectId(session.user.id) },
      { landlordId: session.user.id },
    ],
  };

  // Fetch property to get image blob names
  const property = await collection.findOne(filter);
  if (!property) {
    return NextResponse.json({ error: "Property not found or not owned by user" }, { status: 404 });
  }
  const blobNames = (property.photos || []).map((p: any) => p.blobName).filter(Boolean);
  if (blobNames.length > 0) {
    try {
      await deleteBlobs(blobNames);
    } catch (err) {
      // Log error but continue with property deletion
      console.error("Failed to delete blobs from Azure:", err);
    }
  }

  const result = await collection.deleteOne(filter);
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Property not found or not owned by user" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

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
  const { title, status, rentPcm, address, description } = body;

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
      description: description ?? "",
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
