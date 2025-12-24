import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

// import Property from "@/models/Property";

/**
 * POST /api/landlord/properties
 * Creates a new property in DRAFT state
 */
export async function POST(req: Request) {
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

    // 3. Parse request body and validate using Zod
    const body = await req.json();

    // Use shared Zod schema for property inputs
    const { createPropertySchema } = await import('@/lib/schemas/property');

    const parsed = createPropertySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // normalize availabilityDate (accept ISO string)
    let availabilityDate: Date | undefined = undefined;
    if (data.availabilityDate) {
      availabilityDate = new Date(data.availabilityDate);
      if (Number.isNaN(availabilityDate.getTime())) {
        return NextResponse.json({ error: 'Invalid availabilityDate' }, { status: 400 });
      }
    }

    // 5. Connect to DB
    const propertiesCollection = await getCollection("properties");

    // 6. Create property (ALWAYS draft)
    const propertyDoc = {
      landlordId: new ObjectId(session.user.id),
      title: data.title,
      headline: data.headline,
      description: data.description,
      address: data.address,
      rentPcm: Number(data.rentPcm),
      rentFrequency: data.rentFrequency,
      propertyType: data.propertyType,
      bedrooms: data.bedrooms ?? undefined,
      bathrooms: data.bathrooms ?? undefined,
      furnished: data.furnished ?? 'unknown',
      deposit: data.deposit ?? undefined,
      availabilityDate: availabilityDate,
      tenancyLengthMonths: data.tenancyLengthMonths ?? undefined,
      billsIncluded: data.billsIncluded || [],
      petsAllowed: data.petsAllowed ?? false,
      smokingAllowed: data.smokingAllowed ?? false,
      epcRating: data.epcRating ?? undefined,
      councilTaxBand: data.councilTaxBand ?? undefined,
      sizeSqm: data.sizeSqm ?? undefined,
      parking: data.parking ?? 'none',
      amenities: data.amenities || [],
      virtualTourUrl: data.virtualTourUrl ?? undefined,
      floor: data.floor ?? undefined,
      hmoLicenseRequired: data.hmoLicenseRequired ?? false,
      viewingInstructions: data.viewingInstructions ?? undefined,
      photos: data.photos || [],
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
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
