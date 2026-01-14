import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";

import { authOptions } from "../../../auth/[...nextauth]/route";
import { getCollection } from "../../../../../lib/db";
import { Session } from "next-auth";
import { withApiAudit } from "@/lib/api/withApiAudit";
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
async function updateProperty(req: Request) {
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

    const body = await req.json();

    // Validate using shared partial schema for updates
    const { updatePropertySchema } = await import('@/lib/schemas/property');
    const parsed = updatePropertySchema.safeParse(body);
    if (!parsed.success) {
      console.error('PUT /api/landlord/properties/update - validation failed', {
        body,
        error: parsed.error.format(),
        flatten: parsed.error.flatten(),
        id,
        userId: user?.id,
      });
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Normalize availabilityDate if present
    let availabilityDate: Date | undefined = undefined;
    if (data.availabilityDate) {
      availabilityDate = new Date(data.availabilityDate as string);
      if (Number.isNaN(availabilityDate.getTime())) {
        return NextResponse.json({ error: 'Invalid availabilityDate' }, { status: 400 });
      }
    }

    const properties = await getCollection("properties");

    // Normalize and build $set object only with provided fields (coerce types where appropriate)
    const setFields: any = { updatedAt: new Date() };

    if (data.title !== undefined) setFields.title = String(data.title);
    if (data.headline !== undefined) setFields.headline = String(data.headline);
    if (data.description !== undefined) setFields.description = String(data.description);
    if (data.address !== undefined) setFields.address = data.address;
    if (data.rentPcm !== undefined) setFields.rentPcm = Number(data.rentPcm);
    if (data.rentFrequency !== undefined) setFields.rentFrequency = data.rentFrequency;
    if (data.propertyType !== undefined) setFields.propertyType = data.propertyType;
    if (data.bedrooms !== undefined) setFields.bedrooms = Number(data.bedrooms);
    if (data.bathrooms !== undefined) setFields.bathrooms = Number(data.bathrooms);
    if (data.furnished !== undefined) setFields.furnished = data.furnished;
    if (data.deposit !== undefined) setFields.deposit = Number(data.deposit);
    if (availabilityDate !== undefined) setFields.availabilityDate = availabilityDate;
    if (data.tenancyLengthMonths !== undefined) setFields.tenancyLengthMonths = Number(data.tenancyLengthMonths);
    if (data.billsIncluded !== undefined) setFields.billsIncluded = Array.isArray(data.billsIncluded) ? data.billsIncluded : [data.billsIncluded];
    if (data.petsAllowed !== undefined) setFields.petsAllowed = Boolean(data.petsAllowed);
    if (data.smokingAllowed !== undefined) setFields.smokingAllowed = Boolean(data.smokingAllowed);
    if (data.epcRating !== undefined) setFields.epcRating = data.epcRating;
    if (data.councilTaxBand !== undefined) setFields.councilTaxBand = data.councilTaxBand;
    if (data.sizeSqm !== undefined) setFields.sizeSqm = Number(data.sizeSqm);
    if (data.parking !== undefined) setFields.parking = data.parking;
    if (data.amenities !== undefined) setFields.amenities = Array.isArray(data.amenities) ? data.amenities : [data.amenities];
    // If virtualTourUrl is empty string, don't set it (avoid failing url checks elsewhere)
    if (data.virtualTourUrl !== undefined && String(data.virtualTourUrl).trim() !== '') setFields.virtualTourUrl = String(data.virtualTourUrl);
    if (data.floor !== undefined) setFields.floor = data.floor;
    if (data.hmoLicenseRequired !== undefined) setFields.hmoLicenseRequired = Boolean(data.hmoLicenseRequired);
    if (data.viewingInstructions !== undefined) setFields.viewingInstructions = String(data.viewingInstructions);
    if (data.photos !== undefined) setFields.photos = data.photos;

    console.info('PUT update: id, userId, setFields sample', { id, userId: user?.id, setFields });

    let result;
    try {
      result = await properties.updateOne(
        {
          _id: new ObjectId(id),
          landlordId: new ObjectId(user.id),
        },
        {
          $set: setFields,
        }
      );
    } catch (err) {
      console.error('PUT updateOne error', { err, id, userId: user?.id, setFields });
      return NextResponse.json({ error: 'Update failed', details: String(err) }, { status: 500 });
    }

    if (!result?.matchedCount) {
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

export const PUT = withApiAudit(updateProperty);
