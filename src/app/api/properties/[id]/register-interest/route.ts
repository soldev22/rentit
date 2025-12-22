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

  // If an applicantId isn't provided, try to find or create a user with the provided email
  const users = await getCollection('users');
  let applicantUser: any | null = null;

  if (applicantId) {
    try {
      applicantUser = await users.findOne({ _id: new ObjectId(applicantId) });
    } catch (e) {
      applicantUser = null;
    }
  }

  if (!applicantUser) {
    applicantUser = await users.findOne({ email: String(applicantEmail).toLowerCase() });
  }

  if (!applicantUser) {
    // Create a lightweight applicant user account with a random password
    const randomPass = (Math.random().toString(36).slice(2, 10)) + Math.random().toString(36).slice(2, 6);
    const hashedPassword = await bcrypt.hash(randomPass, 10);
    const insertResult = await users.insertOne({
      email: String(applicantEmail).toLowerCase(),
      name: applicantName,
      hashedPassword,
      role: 'APPLICANT',
      profile: { phone: applicantTel || null },
      createdAt: new Date(),
    });
    applicantUser = await users.findOne({ _id: insertResult.insertedId });
  }

  const canonicalApplicantId = String(applicantUser._id);

  const alreadyRegistered = interests.some((i: any) => {
    if (i.applicantId && String(i.applicantId) === canonicalApplicantId) return true;
    if (i.applicantEmail && String(i.applicantEmail).toLowerCase() === String(applicantEmail).toLowerCase()) return true;
    return false;
  });

  if (alreadyRegistered) {
    return NextResponse.json({ error: "Interest already registered" }, { status: 409 });
  }

  // Add new interest
  const newInterest = {
    applicantId: canonicalApplicantId,
    applicantName,
    applicantEmail: String(applicantEmail).toLowerCase(),
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
        applicantEmail: String(applicantEmail).toLowerCase(),
        applicantTel,
        propertyTitle: property.title || 'Property',
      });
    }
  } catch (err) {
    console.error('sendInterestEmail failed', err);
  }

  return NextResponse.json({ ok: true, interest: newInterest });
}
