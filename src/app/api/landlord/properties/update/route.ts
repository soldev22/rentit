import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";

import { authOptions } from "../../../auth/[...nextauth]/route";
import { getCollection } from "../../../../../lib/db";
import { Session } from "next-auth";
type UserRole =
  | "ADMIN"
  | "LANDLORD"
  | "TENANT"
  | "AGENT"
  | "APPLICANT";

/**
 * PUT /api/landlord/properties/update?id=PROPERTY_ID
 * Updates editable property details (NOT status)
 */
export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid property id" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);

    // Use the augmented Session type to access id and role
    const user = session?.user as (Session["user"] & { id: string; role: UserRole }) | undefined;

    if (!user?.id || user.role !== "LANDLORD") {
      return NextResponse.json(
        { error: "Unauthorised" },
        { status: 401 }
      );
    }

    const { title, rentPcm, address } = await req.json();

    const properties = await getCollection("properties");

    const result = await properties.updateOne(
      {
        _id: new ObjectId(id),
        landlordId: new ObjectId(user.id),
      },
      {
        $set: {
          title,
          rentPcm,
          address,
          updatedAt: new Date(),
        },
      }
    );

    if (!result.matchedCount) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT property update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
