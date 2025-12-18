import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const client = await clientPromise;
  const db = client.db();

  const events = await db
    .collection("audit_events")
    .find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return NextResponse.json(
    events.map((e) => ({
      ...e,
      _id: e._id.toString(),
      targetUserId: e.targetUserId?.toString?.() ?? null,
      createdAt: e.createdAt?.toISOString?.() ?? null,
    }))
  );
}
