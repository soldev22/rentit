
import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import { containerClient } from "@/lib/azureBlob";

export const runtime = "nodejs";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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
