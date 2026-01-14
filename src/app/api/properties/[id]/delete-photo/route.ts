import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import { containerClient } from "@/lib/azureBlob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withApiAudit } from "@/lib/api/withApiAudit";

export const runtime = "nodejs";

async function deletePropertyPhoto(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!['LANDLORD', 'ADMIN', 'AGENT'].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const { blobName } = await req.json();
  if (!blobName) {
    return NextResponse.json({ error: "Missing blobName" }, { status: 400 });
  }

  // Delete from Azure Blob Storage
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();

  // Remove from MongoDB property.photos array
  const properties = await getCollection("properties");
  await properties.updateOne(
    { _id: new ObjectId(id) },
    { $pull: { photos: { blobName } } }
  );

  return NextResponse.json({ success: true });
}

export const DELETE = withApiAudit(deletePropertyPhoto);
