import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { withApiAudit } from "@/lib/api/withApiAudit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function updateMaintenanceIssue(req: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid issue id" }, { status: 400 });
  }

  if (!ObjectId.isValid(session.user.id)) {
    return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
  }

  const { title, status, updateText } = await req.json();

  if (!title && !status && !updateText) {
    return NextResponse.json(
      { error: "Nothing to update" },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db();

  // Build update object explicitly (TS-safe)
  const update: {
    $set: { [key: string]: any };
    $push?: { descriptionHistory: any };
  } = {
    $set: {
      updatedAt: new Date(),
    },
  };

  if (title) {
    update.$set.title = title;
  }

  if (status) {
    update.$set.status = status;
  }

  if (updateText) {
    update.$push = {
      descriptionHistory: {
        text: updateText,
        createdAt: new Date(),
        createdBy: new ObjectId(session.user.id),
        role: session.user.role,
      },
    };
  }

  // Build query based on user role
  const query: any = { _id: new ObjectId(id) };

  if (session.user.role === "TENANT") {
    // Tenants can only update their own issues
    query.tenantId = new ObjectId(session.user.id);
  } else if (["LANDLORD", "AGENT", "ADMIN"].includes(session.user.role)) {
    // Landlords/agents/admins can update issues for properties they own/manage
    const properties = await db
      .collection("properties")
      .find({ landlordId: new ObjectId(session.user.id) })
      .toArray();

    const propertyIds = properties.map((p) => p._id);
    query.propertyId = { $in: propertyIds };
  } else {
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
  }

  const result = await db.collection("maintenance_projects").findOneAndUpdate(
    query,
    update,
    { returnDocument: "after" }
  );

  if (!result.value) {
    return NextResponse.json(
      { error: "Issue not found or not permitted" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}

export const PATCH = withApiAudit(updateMaintenanceIssue);
