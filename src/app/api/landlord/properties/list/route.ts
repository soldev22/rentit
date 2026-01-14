import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import { withApiAudit } from "@/lib/api/withApiAudit";

// import Property from "@/models/Property";

/**
 * POST /api/landlord/properties
 * Creates a new property in DRAFT state
 */
async function listProperties(req: Request) {
  try {
    // 1. Ensure user is logged in
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorised" },
        { status: 401 }
      );
    }

    // 2. Optional role guard (recommended)
    if (session.user.role !== "LANDLORD") {
      return NextResponse.json(
        { error: "Only landlords can create properties" },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await req.json();

    const {
      title,
      description,
      address,
      rentPcm,
    } = body;

    // 4. Minimal validation (keep it simple)
    if (
      !title ||
      !address?.line1 ||
      !address?.city ||
      !address?.postcode ||
      typeof rentPcm !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    // 5. Connect to DB (handled by getDb/getCollection)

    // 6. Create property (ALWAYS draft)
    const propertiesCollection = await getCollection("properties");
    const propertyDoc = {
      landlordId: new ObjectId(session.user.id),
      title,
      description,
      address,
      rentPcm,
      status: "draft",
      rooms: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await propertiesCollection.insertOne(propertyDoc);
    const property = { _id: result.insertedId, ...propertyDoc };

    // 7. Return created property
    return NextResponse.json(
      { property },
      { status: 201 }
    );
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = withApiAudit(listProperties);
