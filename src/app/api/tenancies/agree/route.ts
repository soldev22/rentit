import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "LANDLORD") {
    return NextResponse.json(
      { error: "Only landlords can agree to tenancies" },
      { status: 403 }
    );
  }

  const { applicantId, propertyId } = await req.json();

  if (!applicantId || !propertyId) {
    return NextResponse.json(
      { error: "Missing applicantId or propertyId" },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db();

  // Verify the landlord owns this property
  const property = await db.collection("properties").findOne({
    _id: new ObjectId(propertyId),
    landlordId: new ObjectId(session.user.id),
  });

  if (!property) {
    return NextResponse.json(
      { error: "Property not found or not owned by you" },
      { status: 404 }
    );
  }

  // Check if tenancy already exists
  const existingTenancy = await db.collection("tenancies").findOne({
    tenantId: new ObjectId(applicantId),
    propertyId: new ObjectId(propertyId),
  });

  if (existingTenancy) {
    return NextResponse.json(
      { error: "Tenancy already exists for this applicant and property" },
      { status: 400 }
    );
  }

  // Create the tenancy
  const tenancyResult = await db.collection("tenancies").insertOne({
    tenantId: new ObjectId(applicantId),
    propertyId: new ObjectId(propertyId),
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Update the applicant's role to TENANT if they're not already
  await db.collection("users").updateOne(
    { _id: new ObjectId(applicantId) },
    { $set: { role: "TENANT", updatedAt: new Date() } }
  );

  // Optionally remove this interest from the property
  // (since they've now become a tenant)
  await db.collection("properties").updateOne(
    { _id: new ObjectId(propertyId) },
    {
      $pull: { interests: { applicantId } },
      $set: { updatedAt: new Date() }
    }
  );

  return NextResponse.json({
    success: true,
    tenancyId: tenancyResult.insertedId.toString(),
    message: "Tenancy agreed successfully"
  });
}