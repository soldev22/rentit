import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withApiAudit } from "@/lib/api/withApiAudit";
import { listMessagesForThread } from "@/lib/comms";

async function getThreadMessages(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await params;
  if (!ObjectId.isValid(threadId)) {
    return NextResponse.json({ error: "Invalid thread id" }, { status: 400 });
  }

  const messages = await listMessagesForThread({
    threadId: new ObjectId(threadId),
    userId: new ObjectId(session.user.id),
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      ...m,
      _id: m._id?.toString(),
      threadId: m.threadId.toString(),
      senderUserId: m.senderUserId.toString(),
    })),
  });
}

export const GET = withApiAudit(getThreadMessages);
