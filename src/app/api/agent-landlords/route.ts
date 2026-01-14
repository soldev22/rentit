import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { withApiAudit } from "@/lib/api/withApiAudit";

async function assignLandlord(req: Request) {
  // 1. Auth guard
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "AGENT") {
    return NextResponse.json(
      { error: "Unauthorised" },
      { status: 401 }
    );
  }

  // 2. Read body
  const { landlordId } = await req.json();

  if (!landlordId) {
    return NextResponse.json(
      { error: "landlordId is required" },
      { status: 400 }
    );
  }

  const agentId = session.user.id;

  const collection = await getCollection("agentLandlords");

  // 3. Prevent duplicates
  const existing = await collection.findOne({
    agentId,
    landlordId,
  });

  if (existing) {
    return NextResponse.json(
      { message: "Already assigned" },
      { status: 200 }
    );
  }

  // 4. Insert assignment
  await collection.insertOne({
    agentId,
    landlordId,
    createdAt: new Date(),
  });

  return NextResponse.json({ success: true });
}

export const POST = withApiAudit(assignLandlord);
