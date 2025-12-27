import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

// GET /api/tenancy-applications/me - Get all applications for the current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const applicantId = new ObjectId(session.user.id);
  const applications = await getCollection("tenancy_applications");
  // Join with properties to get property title
  const pipeline = [
    { $match: { applicantId } },
    {
      $lookup: {
        from: "properties",
        localField: "propertyId",
        foreignField: "_id",
        as: "propertyInfo"
      }
    },
    {
      $addFields: {
        propertyTitle: { $arrayElemAt: ["$propertyInfo.title", 0] },
        propertyPhoto: { $arrayElemAt: ["$propertyInfo.photos", 0] },
        propertyAddress: {
          $concat: [
            { $ifNull: [ { $arrayElemAt: ["$propertyInfo.address.line1", 0] }, "" ] },
            " ",
            { $ifNull: [ { $arrayElemAt: ["$propertyInfo.address.city", 0] }, "" ] },
            " ",
            { $ifNull: [ { $arrayElemAt: ["$propertyInfo.address.postcode", 0] }, "" ] }
          ]
        }
      }
    },
    {
      $project: {
        propertyInfo: 0
      }
    }
  ];
  const results = await applications.aggregate(pipeline).toArray();
  return NextResponse.json({ applications: results });
}
