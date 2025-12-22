import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb, getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import { z } from "zod";

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

    const createPropertySchema = z.object({
      title: z.string().min(1),
      headline: z.string().max(120).optional(),
      description: z.string().optional(),
      address: z.object({
        line1: z.string().min(1),
        line2: z.string().optional(),
        city: z.string().min(1),
        postcode: z.string().min(1),
        county: z.string().optional(),
      }),
      rentPcm: z.number().min(0),
      rentFrequency: z.enum(['pcm', 'pw']).optional(),
      propertyType: z.enum(['flat', 'house', 'maisonette', 'studio', 'room', 'other']).optional(),
      bedrooms: z.number().int().min(0).optional(),
      bathrooms: z.number().int().min(0).optional(),
      furnished: z.enum(['furnished', 'part-furnished', 'unfurnished', 'unknown']).optional(),
      deposit: z.number().min(0).optional(),
      availabilityDate: z.union([z.string(), z.date()]).optional(),
      tenancyLengthMonths: z.number().int().min(0).optional(),
      billsIncluded: z.array(z.string()).optional(),
      petsAllowed: z.boolean().optional(),
      smokingAllowed: z.boolean().optional(),
      epcRating: z.enum(['A','B','C','D','E','F','G','unknown']).optional(),
      councilTaxBand: z.enum(['A','B','C','D','E','F','G','H','unknown']).optional(),
      sizeSqm: z.number().min(0).optional(),
      parking: z.enum(['none','on-street','off-street','garage','driveway','permit','other']).optional(),
      amenities: z.array(z.string()).optional(),
      virtualTourUrl: z.string().url().optional(),
      floor: z.string().optional(),
      hmoLicenseRequired: z.boolean().optional(),
      viewingInstructions: z.string().optional(),
      photos: z.array(z.object({ url: z.string().url(), blobName: z.string() })).optional(),
    });

    const parsed = createPropertySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // normalize availabilityDate
    let availabilityDate: Date | undefined = undefined;
    if (data.availabilityDate) {
      availabilityDate = typeof data.availabilityDate === 'string'
        ? new Date(data.availabilityDate)
        : data.availabilityDate;

      if (Number.isNaN(availabilityDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid availabilityDate' },
          { status: 400 }
        );
      }
    }

    // 5. Connect to DB (handled by getDb/getCollection)

    // 6. Create property (ALWAYS draft)
    const propertiesCollection = await getCollection("properties");
    const propertyDoc = {
      landlordId: new ObjectId(session.user.id),
      title: data.title,
      headline: data.headline,
      description: data.description,
      address: data.address,
      rentPcm: data.rentPcm,
      rentFrequency: data.rentFrequency,
      propertyType: data.propertyType,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      furnished: data.furnished,
      deposit: data.deposit,
      availabilityDate: availabilityDate,
      tenancyLengthMonths: data.tenancyLengthMonths,
      billsIncluded: data.billsIncluded || [],
      petsAllowed: data.petsAllowed ?? false,
      smokingAllowed: data.smokingAllowed ?? false,
      epcRating: data.epcRating,
      councilTaxBand: data.councilTaxBand,
      sizeSqm: data.sizeSqm,
      parking: data.parking,
      amenities: data.amenities || [],
      virtualTourUrl: data.virtualTourUrl,
      floor: data.floor,
      hmoLicenseRequired: data.hmoLicenseRequired ?? false,
      viewingInstructions: data.viewingInstructions,
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
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
