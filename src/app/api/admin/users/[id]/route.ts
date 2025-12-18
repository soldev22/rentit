import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import { auditEvent } from "@/lib/audit";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    if (session?.user?.id) {
      await auditEvent({
        action: "ACCESS_DENIED",
        actorUserId: session.user.id,
        description: "Non-admin attempted to update user",
        success: false,
        source: "api/admin/users/[id]",
      });
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;
  const { role, status } = await req.json();

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const users = await getCollection("users");

  try {
    await users.updateOne(
      { _id: new ObjectId(id) },
      { $set: { role, status, updatedAt: new Date() } }
    );

    await auditEvent({
      action: "USER_UPDATED",
      actorUserId: session.user.id ?? "unknown",
      targetUserId: id,
      description: "Admin updated user role/status",
      metadata: { role, status },
      success: true,
      source: "api/admin/users/[id]",
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    await auditEvent({
      action: "USER_UPDATE_FAILED",
      actorUserId: session.user.id ?? "unknown",
      targetUserId: id,
      description: "Failed to update user",
      success: false,
      errorMessage: err.message,
      source: "api/admin/users/[id]",
    });

    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
