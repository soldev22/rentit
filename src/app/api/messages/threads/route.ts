import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withApiAudit } from "@/lib/api/withApiAudit";
import { listThreadsForUser } from "@/lib/comms";

async function listMyThreads() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const threads = await listThreadsForUser(new ObjectId(session.user.id));

  return NextResponse.json({
    threads: threads.map((t) => ({
      ...t,
      _id: t._id?.toString(),
      participants: t.participants.map((p) => ({
        ...p,
        userId: p.userId.toString(),
      })),
    })),
  });
}

export const GET = withApiAudit(listMyThreads);
