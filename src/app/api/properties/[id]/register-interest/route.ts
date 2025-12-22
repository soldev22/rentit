import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import bcrypt from 'bcrypt';
import { getCollection } from "@/lib/db";
import { sendInterestEmail } from '@/lib/email-interest';

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

  // Applicant fields (applicantId optional for guest users)
  const { applicantId, applicantName, applicantEmail, applicantTel } = body;
  if (!applicantName || !applicantEmail) {
    return NextResponse.json({ error: "Missing applicant information" }, { status: 400 });
  }

  // Find property
  const property = await properties.findOne({ _id: new ObjectId(id) });
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  // Prevent duplicate interest --- accept either an authenticated applicantId or an email-based guest id
  const interests = Array.isArray(property.interests) ? property.interests : [];

  const emailLower = String(applicantEmail).toLowerCase();

  const alreadyRegistered = interests.some((i: any) => {
    if (applicantId && i.applicantId === applicantId) return true;
    if (i.applicantEmail && String(i.applicantEmail).toLowerCase() === emailLower) return true;
    return false;
  });

  if (alreadyRegistered) {
    return NextResponse.json({ error: "Interest already registered" }, { status: 409 });
  }

  // Add new interest (do NOT create a user account for guest submissions)
  const newInterest = {
    applicantId: applicantId ?? null,
    applicantName,
    applicantEmail: emailLower,
    applicantTel,
    anonymous: !applicantId,
    date: new Date().toISOString(),
  };

  await properties.updateOne(
    { _id: new ObjectId(id) },
    { $push: { interests: newInterest } }
  );

  // Notify landlord and applicant (best-effort)
  try {
    let landlordEmail: string | null = null;
    if (property.landlordId) {
      try {
        const users = await getCollection('users');
        const landlord = await users.findOne({ _id: new ObjectId(property.landlordId) });
        landlordEmail = landlord?.email || null;
      } catch (e) {
        landlordEmail = null;
      }
    }

    if (landlordEmail) {
      await sendInterestEmail({
        landlordEmail,
        applicantName,
        applicantEmail: emailLower,
        applicantTel,
        propertyTitle: property.title || 'Property',
      });
    }
  } catch (err) {
    console.error('sendInterestEmail failed', err);
  }

  return NextResponse.json({ ok: true, interest: newInterest });
}
