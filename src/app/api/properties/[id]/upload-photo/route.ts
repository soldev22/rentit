
import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import { containerClient } from "@/lib/azureBlob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withApiAudit } from "@/lib/api/withApiAudit";

export const runtime = "nodejs";

async function uploadPropertyPhoto(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!['LANDLORD', 'ADMIN', 'AGENT'].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  // Convert file to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Generate a unique blob name
  const ext = file.name?.split(".").pop() || "jpg";
  const blobName = `${id}_${Date.now()}.${ext}`;

  // Upload to Azure Blob Storage
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: file.type || "image/jpeg" },
  });
  const url = blockBlobClient.url;

  // Update property document in MongoDB (top-level photos array)
  const properties = await getCollection("properties");
  await properties.updateOne(
    { _id: new ObjectId(id) },
    { $push: { photos: { url, blobName } } }
  );

  return NextResponse.json({ url, blobName });
}

export const POST = withApiAudit(uploadPropertyPhoto);
