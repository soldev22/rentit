import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import {
  DEFAULT_LANDLORD_BACKGROUND_CHECK_CRITERIA,
  LandlordBackgroundCheckCriteriaSchema,
} from "@/lib/landlordBackgroundCheckCriteria";

const CollectionName = "landlord_background_check_criteria";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "LANDLORD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const landlordId = new ObjectId(session.user.id);
  const collection = await getCollection(CollectionName);

  const existing = await collection.findOne({ landlordId });
  const criteria = existing?.criteria ?? DEFAULT_LANDLORD_BACKGROUND_CHECK_CRITERIA;

  return NextResponse.json({ criteria });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "LANDLORD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = LandlordBackgroundCheckCriteriaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid criteria", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const landlordId = new ObjectId(session.user.id);
  const collection = await getCollection(CollectionName);
  const now = new Date().toISOString();

  await collection.updateOne(
    { landlordId },
    {
      $set: {
        landlordId,
        criteria: parsed.data,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}
