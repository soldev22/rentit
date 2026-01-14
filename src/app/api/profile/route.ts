import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { withApiAudit } from "@/lib/api/withApiAudit";

async function getProfile() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await getCollection("users");

  const user = await users.findOne(
    { email: session.user.email },
    {
      projection: {
        name: 1,
        email: 1,
        profile: 1,
      },
    }
  );

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    name: user.name ?? "",
    email: user.email,
    profile: user.profile ?? {},
  });
}

async function updateProfile(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, profile } = await req.json();

  const users = await getCollection("users");

  await users.updateOne(
    { email: session.user.email },
    {
      $set: {
        name,
        profile,
        updatedAt: new Date(),
      },
    }
  );

  return NextResponse.json({ ok: true });
}

export const GET = withApiAudit(getProfile);
export const PATCH = withApiAudit(updateProfile);
