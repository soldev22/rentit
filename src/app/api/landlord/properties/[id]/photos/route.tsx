import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { BlobServiceClient } from "@azure/storage-blob";
import { getCollection } from "@/lib/db";

export const runtime = "nodejs";

type Photo = { url: string; blobName: string; isHero?: boolean };

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

function getAzureClients() {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

  if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");
  if (!containerName) throw new Error("Missing AZURE_STORAGE_CONTAINER_NAME");

  const blobServiceClient = BlobServiceClient.fromConnectionString(conn);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  return { containerClient };
}

/**
 * POST /api/landlord/properties/[id]/photos
 * FormData: file (single) OR files (multiple)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid property id" }, { status: 400 });
    }

    const formData = await req.formData();

    // Support "file" (single) and "files" (multi)
    const fileList: File[] = [];
    const fileSingle = formData.get("file");
    if (fileSingle instanceof File) fileList.push(fileSingle);

    const filesMulti = formData.getAll("files");
    for (const f of filesMulti) {
      if (f instanceof File) fileList.push(f);
    }

    if (fileList.length === 0) {
      return NextResponse.json({ error: "No file(s) provided" }, { status: 400 });
    }

    const properties = await getCollection("properties");
    const property = await properties.findOne<{ photos?: Photo[] }>({
      _id: new ObjectId(id),
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const { containerClient } = getAzureClients();
    await containerClient.createIfNotExists();

    const existingPhotos = property.photos ?? [];
    const isFirstUpload = existingPhotos.length === 0;

    const uploaded: Photo[] = [];

    for (let idx = 0; idx < fileList.length; idx++) {
      const file = fileList[idx];
      const safe = sanitizeFilename(file.name || "upload.jpg");
      const blobName = `properties/${id}/${crypto.randomUUID()}-${safe}`;

      const blockBlob = containerClient.getBlockBlobClient(blobName);
      const buffer = Buffer.from(await file.arrayBuffer());

      await blockBlob.uploadData(buffer, {
        blobHTTPHeaders: {
          blobContentType: file.type || "application/octet-stream",
        },
      });

      uploaded.push({
        url: blockBlob.url,
        blobName,
        // if first ever photo, make first uploaded hero automatically
        isHero: isFirstUpload && idx === 0 ? true : false,
      });
    }

    // If we're setting a hero for first upload, we should also ensure old photos (none) are false.
    // If not first upload, keep existing hero unchanged.
    await properties.updateOne(
      { _id: new ObjectId(id) },
      { $push: { photos: { $each: uploaded } } }
    );

    return NextResponse.json({ ok: true, uploaded }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/landlord/properties/[id]/photos
 * JSON body: { blobName: string }
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid property id" }, { status: 400 });
    }

    const body = (await req.json()) as { blobName?: string };
    if (!body?.blobName) {
      return NextResponse.json({ error: "Missing blobName" }, { status: 400 });
    }

    const properties = await getCollection("properties");
    const property = await properties.findOne<{ photos?: Photo[] }>({
      _id: new ObjectId(id),
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const { containerClient } = getAzureClients();
    const blockBlob = containerClient.getBlockBlobClient(body.blobName);

    // delete from Azure (ignore if already missing)
    await blockBlob.deleteIfExists();

    // remove from Mongo
    await properties.updateOne(
      { _id: new ObjectId(id) },
      { $pull: { photos: { blobName: body.blobName } } }
    );

    // Ensure we still have a hero
    const updated = await properties.findOne<{ photos?: Photo[] }>({
      _id: new ObjectId(id),
    });

    const photos = updated?.photos ?? [];
    const hasHero = photos.some((p) => p.isHero);

    if (photos.length > 0 && !hasHero) {
      // set first remaining as hero
      const firstBlob = photos[0].blobName;

      await properties.updateOne(
        { _id: new ObjectId(id) },
        { $set: { "photos.$[].isHero": false } }
      );

      await properties.updateOne(
        { _id: new ObjectId(id) },
        { $set: { "photos.$[p].isHero": true } },
        { arrayFilters: [{ "p.blobName": firstBlob }] }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
