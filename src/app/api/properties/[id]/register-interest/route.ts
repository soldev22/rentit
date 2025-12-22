import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid property ID" }, { status: 400 });
  }

  const properties = await getCollection("properties");

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Required applicant fields
  const { applicantId, applicantName, applicantEmail, applicantTel } = body;
  if (!applicantId || !applicantName || !applicantEmail) {
    return NextResponse.json({ error: "Missing applicant information" }, { status: 400 });
  }

  // Find property
  const property = await properties.findOne({ _id: new ObjectId(id) });
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  // Prevent duplicate interest
  const interests = Array.isArray(property.interests) ? property.interests : [];
  const alreadyRegistered = interests.some((i: any) => i.applicantId === applicantId);
  if (alreadyRegistered) {
    return NextResponse.json({ error: "Interest already registered" }, { status: 409 });
  }

  // Add new interest
  const newInterest = {
    applicantId,
    applicantName,
    applicantEmail,
    applicantTel,
    date: new Date().toISOString(),
  };
  await properties.updateOne(
    { _id: new ObjectId(id) },
    { $push: { interests: newInterest } }
  );

  return NextResponse.json({ ok: true, interest: newInterest });
}
