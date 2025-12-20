import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, { params }: RouteContext) {
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

  const { title, updateText } = await req.json();

  if (!title && !updateText) {
    return NextResponse.json(
      { error: "Nothing to update" },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db();

  // Build update object explicitly (TS-safe)
  const update: any = {
    $set: {
      updatedAt: new Date(),
    },
  };

  if (title) {
    update.$set.title = title;
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

  const result = await db.collection("maintenance_projects").findOneAndUpdate(
    {
      _id: new ObjectId(id),
      tenantId: new ObjectId(session.user.id),
    },
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
