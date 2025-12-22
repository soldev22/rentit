import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { containerClient } from "@/lib/azureBlob";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    if (session.user.role !== "LANDLORD") {
      return NextResponse.json({ error: "Only landlords can upload photos" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file") as unknown as File;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const blobName = `properties/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload data
    await blockBlobClient.uploadData(Buffer.from(arrayBuffer));

    return NextResponse.json({ url: blockBlobClient.url, blobName }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
