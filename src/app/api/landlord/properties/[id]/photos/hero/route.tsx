import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
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

    // 1) Clear all hero flags
    await properties.updateOne(
      { _id: new ObjectId(id) },
      { $set: { "photos.$[].isHero": false } }
    );

    // 2) Set selected photo as hero
    const res = await properties.updateOne(
      { _id: new ObjectId(id) },
      { $set: { "photos.$[p].isHero": true } },
      { arrayFilters: [{ "p.blobName": body.blobName }] }
    );

    if (!res.modifiedCount) {
      return NextResponse.json(
        { error: "Photo not found on property" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
