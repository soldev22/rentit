import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import { containerClient } from "@/lib/azureBlob";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = context.params;
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
