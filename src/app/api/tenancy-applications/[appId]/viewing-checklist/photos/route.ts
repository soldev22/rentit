import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { BlobServiceClient } from "@azure/storage-blob";
import crypto from "crypto";
import path from "path";
import { promises as fs } from "fs";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getTenancyApplicationById, updateTenancyApplication } from "@/lib/tenancy-application";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (phone photos can be larger)
const MAX_FILES = 8;
// iPhone often produces HEIC/HEIF. We accept it and store as-is.
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"] as const;

function getExtension(fileName: string | undefined) {
  const ext = (fileName?.split(".").pop() || "").toLowerCase();
  return ext;
}

function getAzureContainerClient() {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName =
    process.env.AZURE_STORAGE_CONTAINER_NAME || process.env.AZURE_STORAGE_CONTAINER;

  if (!conn || !containerName) return null;

  const blobServiceClient = BlobServiceClient.fromConnectionString(conn);
  return blobServiceClient.getContainerClient(containerName);
}

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

  const containerClient = getAzureContainerClient();
  if (containerClient) {
    await containerClient.createIfNotExists();
  }

  if (!containerClient && process.env.VERCEL) {
    return NextResponse.json(
      {
        error:
          "Photo uploads require Azure Blob Storage in production. Set AZURE_STORAGE_CONNECTION_STRING and AZURE_STORAGE_CONTAINER_NAME (or AZURE_STORAGE_CONTAINER).",
      },
      { status: 500 }
    );
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "viewing-checklist");
  if (!containerClient) {
    // Local/dev fallback only. Vercel/serverless filesystems are not durable.
    await fs.mkdir(uploadsDir, { recursive: true });
  }

  const nowIso = new Date().toISOString();
  const landlordObjectId = ObjectId.isValid(session.user.id) ? new ObjectId(session.user.id) : undefined;

  const uploaded: Array<{
    url: string;
    blobName?: string;
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
        { error: `File too large (max 10MB): ${file.name || "upload"}` },
        { status: 400 }
      );
    }

    const ext = getExtension(file.name);
    const mimeOk = ALLOWED_MIME_TYPES.includes(file.type);
    const extOk = ALLOWED_EXTENSIONS.includes(ext as any);

    // Some mobile browsers report empty/unknown mime types (or octet-stream) for HEIC.
    if (!mimeOk && !(extOk && (!file.type || file.type === "application/octet-stream"))) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type || "unknown"}` },
        { status: 400 }
      );
    }

    const safeExt = ext || "jpg";
    const safe = sanitizeFilename(file.name || `photo-${idx + 1}.${safeExt}`);
    const buffer = Buffer.from(await file.arrayBuffer());

    if (containerClient) {
      const blobName = `viewing-checklists/${appId}/${crypto.randomUUID()}-${safe}`;
      const blockBlob = containerClient.getBlockBlobClient(blobName);

      await blockBlob.uploadData(buffer, {
        blobHTTPHeaders: {
          blobContentType: file.type || "application/octet-stream",
        },
      });

      uploaded.push({
        url: blockBlob.url,
        blobName,
        uploadedAt: nowIso,
        uploadedBy: landlordObjectId,
        fileName: safe,
        mimeType: file.type,
        sizeBytes: file.size,
      });
    } else {
      const fileName = `viewing_${appId}_${Date.now()}_${idx}_${safe}`;
      const filePath = path.join(uploadsDir, fileName);
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
