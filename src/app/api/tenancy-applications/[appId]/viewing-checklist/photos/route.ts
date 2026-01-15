import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import path from "path";
import { promises as fs } from "fs";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getTenancyApplicationById, updateTenancyApplication } from "@/lib/tenancy-application";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 8;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export async function POST(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "LANDLORD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { appId } = await context.params;
  if (!ObjectId.isValid(appId)) {
    return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
  }

  const application = await getTenancyApplicationById(appId);
  if (!application?._id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (application.landlordId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await req.formData();

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

  if (fileList.length > MAX_FILES) {
    return NextResponse.json({ error: `Too many files (max ${MAX_FILES})` }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "viewing-checklist");
  await fs.mkdir(uploadsDir, { recursive: true });

  const nowIso = new Date().toISOString();
  const landlordObjectId = ObjectId.isValid(session.user.id) ? new ObjectId(session.user.id) : undefined;

  const uploaded: Array<{
    url: string;
    uploadedAt: string;
    uploadedBy?: ObjectId;
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
  }> = [];

  for (let idx = 0; idx < fileList.length; idx++) {
    const file = fileList[idx];

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (max 5MB): ${file.name || "upload"}` },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type || "unknown"}` },
        { status: 400 }
      );
    }

    const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
    const safe = sanitizeFilename(file.name || `photo-${idx + 1}.${ext}`);
    const fileName = `viewing_${appId}_${Date.now()}_${idx}_${safe}`;
    const filePath = path.join(uploadsDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    uploaded.push({
      url: `/uploads/viewing-checklist/${fileName}`,
      uploadedAt: nowIso,
      uploadedBy: landlordObjectId,
      fileName: safe,
      mimeType: file.type,
      sizeBytes: file.size,
    });
  }

  const existing = application.stage1.viewingSummary?.photos ?? [];
  const nextPhotos = [...existing, ...uploaded];

  const ok = await updateTenancyApplication(appId, {
    stage1: {
      ...application.stage1,
      viewingSummary: {
        ...(application.stage1.viewingSummary ?? {}),
        photos: nextPhotos,
        savedAt: nowIso,
        completedBy: landlordObjectId ?? application.stage1.viewingSummary?.completedBy,
      },
    },
  });

  if (!ok) return NextResponse.json({ error: "Failed to save" }, { status: 500 });

  return NextResponse.json({ ok: true, uploaded }, { status: 200 });
}
