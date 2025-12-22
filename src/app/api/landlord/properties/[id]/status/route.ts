import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { canTransition } from "@/lib/propertyStatus";
import type { PropertyStatus } from "@/models/Property";

import type { NextRequest } from "next/server";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = context.params;


  try {
    // 1️⃣ Auth check
    const session = await getServerSession(authOptions);
    console.log("STATUS ROUTE PARAMS:", id);

    if (!session?.user?.id || session.user.role !== "LANDLORD") {
      return NextResponse.json(
        { error: "Unauthorised" },
        { status: 401 }
      );
    }

    // 2️⃣ Validate propertyId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid property id" },
        { status: 400 }
      );
    }

    const propertyId = new ObjectId(id);
    const landlordId = new ObjectId(String(session.user.id));

    // 3️⃣ Parse body
    const body = await req.json();
    const newStatus = body.status as PropertyStatus;

    if (!newStatus) {
      return NextResponse.json(
        { error: "Missing status" },
        { status: 400 }
      );
    }

    // 4️⃣ Load property and verify ownership
    const properties = await getCollection("properties");

    const property = await properties.findOne({
      _id: propertyId,
      landlordId,
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    const currentStatus = property.status as PropertyStatus;

    // 5️⃣ Validate transition
    if (!canTransition(currentStatus, newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
        },
        { status: 400 }
      );
    }

    // 6️⃣ Apply update
    await properties.updateOne(
      { _id: propertyId },
      {
        $set: {
          status: newStatus,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json(
      {
        success: true,
        previousStatus: currentStatus,
        status: newStatus,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH property status error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
