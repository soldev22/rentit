import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sendInterestEmail } from "@/lib/email-interest";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const propertyId = params.id;
  const applicantId = session.user.id;
  const applicantName = session.user.name;
  const applicantEmail = session.user.email;
  const applicantTel = session.user.tel;

  // Store interest in property document
  const properties = await getCollection("properties");
  const result = await properties.updateOne(
    { _id: new ObjectId(propertyId) },
    {
      $addToSet: {
        interests: {
          applicantId,
          applicantName,
          applicantEmail,
          applicantTel,
          date: new Date(),
        },
      },
    }
  );


  // Fetch property to get landlordId and title
  const property = await properties.findOne({ _id: new ObjectId(propertyId) });
  let landlordEmail = null;
  let propertyTitle = property?.title || "Property";
  if (property?.landlordId) {
    const users = await getCollection("users");
    const landlord = await users.findOne({ _id: typeof property.landlordId === 'string' ? new ObjectId(property.landlordId) : property.landlordId });
    landlordEmail = landlord?.email;
  }

  if (landlordEmail) {
    await sendInterestEmail({
      landlordEmail,
      applicantName,
      applicantEmail,
      applicantTel,
      propertyTitle
    });
  }

  return NextResponse.json({ ok: true });
}
