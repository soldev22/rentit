
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import { deleteBlobs } from "@/lib/azureBlob";

export async function DELETE(
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
  const blobNames = (property.photos || []).map((p: any) => p.blobName).filter(Boolean);
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

export async function PUT(
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
  const body = await req.json();

  // Validate using shared update schema (accepts partial updates)
  const { updatePropertySchema } = await import('@/lib/schemas/property');
  const parsed = updatePropertySchema.safeParse(body);
  if (!parsed.success) {
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

  const setFields: any = { updatedAt: new Date() };
  if (data.title !== undefined) setFields.title = data.title;
  if (data.status !== undefined) setFields.status = data.status;
  if (data.rentPcm !== undefined) setFields.rentPcm = Number(data.rentPcm);
  if (data.description !== undefined) setFields.description = data.description;
  if (data.address !== undefined) {
    if (data.address.line1 !== undefined) setFields['address.line1'] = data.address.line1;
    if (data.address.city !== undefined) setFields['address.city'] = data.address.city;
    if (data.address.postcode !== undefined) setFields['address.postcode'] = data.address.postcode;
  }
  if (data.deposit !== undefined) setFields.deposit = data.deposit;
  if (data.amenities !== undefined) setFields.amenities = data.amenities;
  if (data.virtualTourUrl !== undefined) setFields.virtualTourUrl = data.virtualTourUrl;
  if (data.viewingInstructions !== undefined) setFields.viewingInstructions = data.viewingInstructions;
  if (data.furnished !== undefined) setFields.furnished = data.furnished;
  if (data.bedrooms !== undefined) setFields.bedrooms = data.bedrooms;
  if (data.bathrooms !== undefined) setFields.bathrooms = data.bathrooms;
  if (data.sizeSqm !== undefined) setFields.sizeSqm = data.sizeSqm;
  if (data.tenancyLengthMonths !== undefined) setFields.tenancyLengthMonths = data.tenancyLengthMonths;
  if (data.billsIncluded !== undefined) setFields.billsIncluded = data.billsIncluded;
  if (data.petsAllowed !== undefined) setFields.petsAllowed = data.petsAllowed;
  if (data.smokingAllowed !== undefined) setFields.smokingAllowed = data.smokingAllowed;
  if (data.epcRating !== undefined) setFields.epcRating = data.epcRating;
  if (data.councilTaxBand !== undefined) setFields.councilTaxBand = data.councilTaxBand;
  if (data.parking !== undefined) setFields.parking = data.parking;
  if (data.floor !== undefined) setFields.floor = data.floor;
  if (data.hmoLicenseRequired !== undefined) setFields.hmoLicenseRequired = data.hmoLicenseRequired;
  if (data.photos !== undefined) setFields.photos = data.photos;
  // Debug: log request body, filter, update and result
  try {
    console.log('Updating property', { propertyId, sessionUser: session.user?.id });
    console.log('Request body:', body);
    console.log('Update object:', update);
    const result = await collection.updateOne(filter, { $set: setFields });
    console.log('Update result:', result);
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Property not found or not owned by user" }, { status: 404 });
    }
    // Always return 200 if property found, indicate if anything changed
    return NextResponse.json({ ok: true, changed: result.modifiedCount > 0, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error("Failed to update property:", err);
    return NextResponse.json({ error: "Failed to update property." }, { status: 500 });
  }
}
