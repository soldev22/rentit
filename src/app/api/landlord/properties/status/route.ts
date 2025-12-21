import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { canTransition } from "@/lib/propertyStatus";
import type { PropertyStatus } from "@/models/Property";

export async function PATCH(req: Request) {
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

    if (!session?.user?.id || session.user.role !== "LANDLORD") {
      return NextResponse.json(
        { error: "Unauthorised" },
        { status: 401 }
      );
    }

    const { status: newStatus } = await req.json();

    if (!newStatus) {
      return NextResponse.json(
        { error: "Missing status" },
        { status: 400 }
      );
    }

    const properties = await getCollection("properties");

    const property = await properties.findOne({
      _id: new ObjectId(id),
      landlordId: new ObjectId(session.user.id),
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    const currentStatus = property.status as PropertyStatus;
// 🔎 TEMP DEBUG — ADD THIS LINE
console.log("STATUS TRANSITION:", currentStatus, "→", newStatus);
    if (!canTransition(currentStatus, newStatus)) {
      return NextResponse.json(
        { error: "Invalid status transition" },
        { status: 400 }
      );
    }

    await properties.updateOne(
      { _id: property._id },
      { $set: { status: newStatus, updatedAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      previousStatus: currentStatus,
      status: newStatus,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
