import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { withApiAudit } from "@/lib/api/withApiAudit";

async function listUsers() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const users = await getCollection("users");

  const result = await users
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json(
    result.map((u) => ({
      ...u,
      _id: u._id.toString(),
    }))
  );
}

export const GET = withApiAudit(listUsers);
