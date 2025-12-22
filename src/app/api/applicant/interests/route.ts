import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const applicantId = session.user.id;
  const properties = await getCollection("properties");
  // Find all properties where interests contains applicantId
  const interestedProperties = await properties
    .find({ "interests.applicantId": applicantId })
    .project({ _id: 1, title: 1, interests: 1 })
    .toArray();

  // Flatten interests for this applicant
  const interests = [];
  for (const prop of interestedProperties) {
    const propInterests = Array.isArray(prop.interests) ? prop.interests : [];
    for (const i of propInterests) {
      if (i.applicantId === applicantId) {
        interests.push({
          propertyId: prop._id.toString(),
          propertyTitle: prop.title,
          date: i.date,
        });
      }
    }
  }

  return NextResponse.json({ interests });
}
