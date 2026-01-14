import { z } from "zod";

// Define the Photo schema with isHero
const PhotoSchema = z.object({
  url: z.string(),
  blobName: z.string(),
  isHero: z.boolean().optional(),
});

// Define the address schema
const AddressSchema = z.object({
  line1: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
});

// Define the updatePropertySchema with all fields
export const updatePropertySchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  rentPcm: z.number().optional(),
  deposit: z.number().optional(),
  status: z.enum(["draft", "listed", "paused", "let", "breached"]).optional(),
  amenities: z.array(z.string()).optional(),
  virtualTourUrl: z.string().optional(),
  viewingInstructions: z.string().optional(),
  address: AddressSchema.optional(),
  photos: z.array(PhotoSchema).optional(),
  furnished: z.boolean().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  sizeSqm: z.number().optional(),
  tenancyLengthMonths: z.number().optional(),
  billsIncluded: z.array(z.string()).optional(),
  petsAllowed: z.boolean().optional(),
  smokingAllowed: z.boolean().optional(),
  epcRating: z.string().optional(),
  councilTaxBand: z.string().optional(),
  parking: z.string().optional(),
  floor: z.string().optional(),
  hmoLicenseRequired: z.boolean().optional(),
});

// Define the createPropertySchema (similar but may require more mandatory fields)
export const createPropertySchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  rentPcm: z.number(),
  deposit: z.number().optional(),
  status: z.enum(["draft", "listed", "paused", "let", "breached"]).default("draft"),
  amenities: z.array(z.string()).optional(),
  virtualTourUrl: z.string().optional(),
  viewingInstructions: z.string().optional(),
  address: AddressSchema,
  photos: z.array(PhotoSchema).optional(),
  furnished: z.boolean().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  sizeSqm: z.number().optional(),
  tenancyLengthMonths: z.number().optional(),
  billsIncluded: z.array(z.string()).optional(),
  petsAllowed: z.boolean().optional(),
  smokingAllowed: z.boolean().optional(),
  epcRating: z.string().optional(),
  councilTaxBand: z.string().optional(),
  parking: z.string().optional(),
  floor: z.string().optional(),
  hmoLicenseRequired: z.boolean().optional(),
});

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import { deleteBlobs } from "@/lib/azureBlob";
import { withApiAudit } from "@/lib/api/withApiAudit";

async function deleteProperty(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  // 1. Auth guard
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "LANDLORD") {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const { id: propertyId } = await context.params;
  const collection = await getCollection("properties");
  const filter = {
    _id: new ObjectId(propertyId),
    $or: [
      { landlordId: new ObjectId(session.user.id) },
      { landlordId: session.user.id },
    ],
  };

  // Fetch property to get image blob names
  const property = await collection.findOne(filter);
  if (!property) {
    return NextResponse.json({ error: "Property not found or not owned by user" }, { status: 404 });
  }
  const blobNames = (property.photos || []).map((p: { blobName: string }) => p.blobName).filter(Boolean);
  if (blobNames.length > 0) {
    try {
      await deleteBlobs(blobNames);
    } catch (err) {
      // Log error but continue with property deletion
      console.error("Failed to delete blobs from Azure:", err);
    }
  }

  const result = await collection.deleteOne(filter);
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Property not found or not owned by user" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

async function updateProperty(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  // 1. Auth guard
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "LANDLORD") {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const { id: propertyId } = await context.params;

  // 2. Parse body
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  // Normalize some incoming fields to avoid validation false-positives
  if (body?.virtualTourUrl !== undefined) {
    body.virtualTourUrl = String(body.virtualTourUrl).trim();
    if (body.virtualTourUrl === '') delete body.virtualTourUrl;
  }

  // Validate using shared update schema (accepts partial updates)
  const { updatePropertySchema } = await import('@/lib/schemas/property');
  const parsed = updatePropertySchema.safeParse(body);
  if (!parsed.success) {
    console.error('PUT /api/landlord/properties/:id - validation failed', { bodyKeys: Object.keys(body || {}), error: parsed.error.format() });
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // 3. Update DB
  const collection = await getCollection("properties");

  // NOTE: Check your DB: landlordId may be ObjectId or string. Adjust as needed.
  const filter = {
    _id: new ObjectId(propertyId),
    $or: [
      { landlordId: new ObjectId(session.user.id) },
      { landlordId: session.user.id }, // legacy
    ],
  };

  interface PropertyUpdateFields {
    updatedAt: Date;
    title?: string;
    status?: "draft" | "listed" | "paused" | "let" | "breached";
    rentPcm?: number;
    description?: string;
    "address.line1"?: string;
    "address.city"?: string;
    "address.postcode"?: string;
    deposit?: number;
    amenities?: string[];
    virtualTourUrl?: string;
    viewingInstructions?: string;
    furnished?: boolean;
    bedrooms?: number;
    bathrooms?: number;
    sizeSqm?: number;
    tenancyLengthMonths?: number;
    billsIncluded?: string[];
    petsAllowed?: boolean;
    smokingAllowed?: boolean;
    epcRating?: string;
    councilTaxBand?: string;
    parking?: string;
    floor?: string;
    hmoLicenseRequired?: boolean;
    photos?: Array<{ url: string; blobName: string; isHero?: boolean }>;
  }
  const setFields: PropertyUpdateFields = { updatedAt: new Date() };
  if (data.title !== undefined) setFields.title = data.title;
  if (data.status !== undefined) setFields.status = data.status;
  if (data.rentPcm !== undefined) setFields.rentPcm = Number(data.rentPcm);
  if (data.description !== undefined) setFields.description = data.description;
  if (data.address !== undefined) {
    if (data.address.line1 !== undefined) setFields['address.line1'] = data.address.line1;
    if (data.address.city !== undefined) setFields['address.city'] = data.address.city;
    if (data.address.postcode !== undefined) setFields['address.postcode'] = data.address.postcode;
  }
  if (data.deposit !== undefined) setFields.deposit = Number(data.deposit);
  if (data.amenities !== undefined) setFields.amenities = Array.isArray(data.amenities) ? data.amenities : [data.amenities];
  if (data.virtualTourUrl !== undefined && String(data.virtualTourUrl).trim() !== '') setFields.virtualTourUrl = String(data.virtualTourUrl);
  if (data.viewingInstructions !== undefined) setFields.viewingInstructions = String(data.viewingInstructions);
  if (data.furnished !== undefined) {
    // Accept both boolean and string values for furnished
    if (typeof data.furnished === "boolean") {
      setFields.furnished = data.furnished;
    } else if (typeof data.furnished === "string") {
      // Map string values to boolean: "furnished" or "part-furnished" => true, "unfurnished" => false, "unknown" => undefined
      if (data.furnished === "furnished" || data.furnished === "part-furnished") {
        setFields.furnished = true;
      } else if (data.furnished === "unfurnished") {
        setFields.furnished = false;
      } else {
        setFields.furnished = undefined;
      }
    }
  }
  if (data.bedrooms !== undefined) setFields.bedrooms = Number(data.bedrooms);
  if (data.bathrooms !== undefined) setFields.bathrooms = Number(data.bathrooms);
  if (data.sizeSqm !== undefined) setFields.sizeSqm = Number(data.sizeSqm);
  if (data.tenancyLengthMonths !== undefined) setFields.tenancyLengthMonths = Number(data.tenancyLengthMonths);
  if (data.billsIncluded !== undefined) setFields.billsIncluded = Array.isArray(data.billsIncluded) ? data.billsIncluded : [data.billsIncluded];
  if (data.petsAllowed !== undefined) setFields.petsAllowed = Boolean(data.petsAllowed);
  if (data.smokingAllowed !== undefined) setFields.smokingAllowed = Boolean(data.smokingAllowed);
  if (data.epcRating !== undefined) setFields.epcRating = data.epcRating;
  if (data.councilTaxBand !== undefined) setFields.councilTaxBand = data.councilTaxBand;
  if (data.parking !== undefined) setFields.parking = data.parking;
  if (data.floor !== undefined) setFields.floor = data.floor;
  if (data.hmoLicenseRequired !== undefined) setFields.hmoLicenseRequired = Boolean(data.hmoLicenseRequired);
  if (data.photos !== undefined) setFields.photos = data.photos;
  // Debug: log request body, filter, update and result
  try {
    // write debug snapshot to disk to help E2E debugging
    try {
      const { promises: fs } = await import('fs');
      const debugPath = `test-results/debug-server-update-${Date.now()}.json`;
      await fs.writeFile(debugPath, JSON.stringify({ body, data, setFields, filter }, null, 2));
      console.log('Wrote server debug file', debugPath);
    } catch (e) {
      console.warn('Could not write server debug file', e);
    }

    console.log('Updating property', { propertyId, sessionUser: session.user?.id, setFieldsSample: Object.keys(setFields).slice(0,10) });
    console.log('Request body keys:', Object.keys(body || {}));
    console.log('Parsed data keys:', Object.keys(data || {}));
    console.log('Set fields to be applied:', setFields);
    const result = await collection.updateOne(filter, { $set: setFields });
    console.log('Update result:', { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Property not found or not owned by user" }, { status: 404 });
    }

    if (result.modifiedCount === 0) {
      // No fields changed — write current DB doc for debugging
      try {
        const current = await collection.findOne({ _id: new ObjectId(propertyId) });
        try {
          const { promises: fs } = await import('fs');
          const dumpPath = `test-results/debug-server-current-${Date.now()}.json`;
          await fs.writeFile(dumpPath, JSON.stringify({ current }, null, 2));
          console.warn('Update applied no changes; wrote current doc snapshot to', dumpPath);
        } catch (e) {
          console.warn('Update applied no changes; current doc snapshot keys:', Object.keys(current || {}).slice(0,20));
          console.warn('Could not write current doc snapshot', e);
        }
      } catch (e) {
        console.warn('Could not fetch current doc after no-op update', e);
      }
    }

    // Fetch the updated document to return to client so UI/tests can rehydrate immediately
    const current = await collection.findOne({ _id: new ObjectId(propertyId) });
    const property = current ? {
      _id: current._id.toString(),
      title: current.title,
      description: current.description,
      address: current.address,
      rentPcm: current.rentPcm,
      rooms: current.rooms,
      bedrooms: current.bedrooms,
      bathrooms: current.bathrooms,
      furnished: current.furnished,
      deposit: current.deposit,
      tenancyLengthMonths: current.tenancyLengthMonths,
      billsIncluded: current.billsIncluded || [],
      petsAllowed: current.petsAllowed,
      smokingAllowed: current.smokingAllowed,
      epcRating: current.epcRating,
      councilTaxBand: current.councilTaxBand,
      sizeSqm: current.sizeSqm,
      parking: current.parking,
      amenities: current.amenities || [],
      virtualTourUrl: current.virtualTourUrl,
      floor: current.floor,
      hmoLicenseRequired: current.hmoLicenseRequired,
      viewingInstructions: current.viewingInstructions,
      status: current.status,
      photos: current.photos || [],
      createdAt: current.createdAt,
    } : null;

    // Always return 200 if property found, indicate if anything changed and include updated property
    return NextResponse.json({ ok: true, changed: result.modifiedCount > 0, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, property });
  } catch (err) {
    console.error("Failed to update property:", err);
    return NextResponse.json({ error: "Failed to update property.", details: String(err) }, { status: 500 });
  }
}
// Insert this after the PUT function's closing brace

// ... existing code ...

async function setHeroPhoto(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const propertyId = id;

    console.log('PATCH called for propertyId:', propertyId);  // Add this to debug

    // Auth check
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "LANDLORD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse body
    const body = await req.json();
    const { heroBlobName } = body;

    console.log('PATCH heroBlobName:', heroBlobName);  // Add this to debug

    if (!heroBlobName || typeof heroBlobName !== "string") {
      return NextResponse.json({ error: "Invalid heroBlobName" }, { status: 400 });
    }

    // Update DB: set isHero true for the heroBlobName, false for others
    const collection = await getCollection("properties");

    const filter = {
      _id: new ObjectId(propertyId),
      $or: [
        { landlordId: new ObjectId(session.user.id) },
        { landlordId: session.user.id }, // legacy
      ],
    };

    const updateOp = {
      $set: {
        "photos.$[].isHero": false,  // Set all to false first
        "photos.$[elem].isHero": true,  // Then set the matching one to true
        updatedAt: new Date(),
      },
    };

    const arrayFilters = [{ "elem.blobName": heroBlobName }];

    const result = await collection.updateOne(filter, updateOp, { arrayFilters });

    console.log('PATCH update result:', result);  // Add this to debug

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Property not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ message: "Hero updated" }, { status: 200 });
  } catch (error) {
    console.error("Error updating hero:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const DELETE = withApiAudit(deleteProperty);
export const PUT = withApiAudit(updateProperty);
export const PATCH = withApiAudit(setHeroPhoto);