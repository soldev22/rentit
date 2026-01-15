import { NextRequest, NextResponse } from "next/server";
import { getTenancyApplicationById, updateTenancyApplication } from "@/lib/tenancy-application";
import { ObjectId } from "mongodb";
import { BlobServiceClient } from "@azure/storage-blob";
import crypto from "crypto";

export const runtime = "nodejs"; // Required for file upload

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

function getAzureContainerClient() {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName =
    process.env.AZURE_STORAGE_CONTAINER_NAME || process.env.AZURE_STORAGE_CONTAINER;
  if (!conn || !containerName) return null;
  const blobServiceClient = BlobServiceClient.fromConnectionString(conn);
  return blobServiceClient.getContainerClient(containerName);
}

export async function POST(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
  const { appId } = await context.params;
  if (!ObjectId.isValid(appId)) {
    return NextResponse.json({ error: "Invalid application ID" }, { status: 400 });
  }

  // Fetch the application from the database
  const application = await getTenancyApplicationById(appId);
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // Token validation (single-use, expiry)
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const partyRaw = url.searchParams.get('party');
  const party: 'primary' | 'coTenant' = partyRaw === 'coTenant' ? 'coTenant' : 'primary';

  const stage2 = application.stage2;
  const partyStage2 = party === 'coTenant' ? stage2?.coTenant : stage2;

  if (!token || partyStage2?.token !== token) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });
  }
  if (partyStage2?.tokenUsed) {
    return NextResponse.json({ error: "Token already used" }, { status: 403 });
  }
  if (partyStage2?.tokenExpiresAt && new Date(partyStage2.tokenExpiresAt) < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 403 });
  }

  // Parse multipart form data
  const formData = await req.formData();
  const employmentStatus = formData.get("employmentStatus")?.toString() || "";
  const employerName = formData.get("employerName")?.toString() || "";
  const employerEmail = formData.get("employerEmail")?.toString() || "";
  const previousEmployerName = formData.get("previousEmployerName")?.toString() || "";
  const previousEmployerEmail = formData.get("previousEmployerEmail")?.toString() || "";
  const employmentContractType = formData.get("employmentContractType")?.toString() || "";
  const jobTitle = formData.get("jobTitle")?.toString() || "";
  const monthlyIncome = parseFloat(formData.get("monthlyIncome")?.toString() || "0");
  const employmentLength = formData.get("employmentLength")?.toString() || "";
  const prevLandlordName = formData.get("prevLandlordName")?.toString() || "";
  const prevLandlordContact = formData.get("prevLandlordContact")?.toString() || "";
  const prevLandlordEmail = formData.get("prevLandlordEmail")?.toString() || "";
  const creditConsent = formData.get("creditConsent") === "on";
  const photoIdFrontFile = formData.get("photoIdFront");
  const photoIdBackFile = formData.get("photoIdBack");


  // File upload validation
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

  const origin = (() => {
    try {
      return new URL(req.url).origin;
    } catch {
      return null;
    }
  })();
  const baseUrl =
    origin ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const containerClient = getAzureContainerClient();
  if (!containerClient) {
    const errorMsg = encodeURIComponent(
      "Uploads require Azure Blob Storage. Set AZURE_STORAGE_CONNECTION_STRING and AZURE_STORAGE_CONTAINER_NAME (or AZURE_STORAGE_CONTAINER)."
    );
    return NextResponse.redirect(
      `${baseUrl}/application/complete/${appId}?token=${encodeURIComponent(token ?? "")}&party=${encodeURIComponent(party)}&error=${errorMsg}`,
      303
    );
  }
  await containerClient.createIfNotExists();
  if (!employmentStatus || !monthlyIncome || !creditConsent || !photoIdFrontFile || typeof photoIdFrontFile === "string") {
    const errorMsg = encodeURIComponent("Missing required fields");
    return NextResponse.redirect(`${baseUrl}/application/complete/${appId}?token=${encodeURIComponent(token ?? "")}&party=${encodeURIComponent(party)}&error=${errorMsg}`, 303);
  }

  // Validate front file
  const fileFront = photoIdFrontFile as File;
  if (fileFront.size > MAX_FILE_SIZE) {
    const errorMsg = encodeURIComponent("Front of photo ID is too large (max 5MB)");
    return NextResponse.redirect(`${baseUrl}/application/complete/${appId}?token=${encodeURIComponent(token ?? "")}&party=${encodeURIComponent(party)}&error=${errorMsg}`, 303);
  }
  if (!ALLOWED_MIME_TYPES.includes(fileFront.type)) {
    const errorMsg = encodeURIComponent("Invalid file type for front of photo ID. Only JPEG, PNG, or PDF allowed.");
    return NextResponse.redirect(`${baseUrl}/application/complete/${appId}?token=${encodeURIComponent(token ?? "")}&party=${encodeURIComponent(party)}&error=${errorMsg}`, 303);
  }

  // Validate back file if present
  let fileBack: File | null = null;
  if (photoIdBackFile && typeof photoIdBackFile !== "string") {
    fileBack = photoIdBackFile as File;
    if (fileBack.size > MAX_FILE_SIZE) {
      const errorMsg = encodeURIComponent("Back of photo ID is too large (max 5MB)");
      return NextResponse.redirect(`${baseUrl}/application/complete/${appId}?token=${encodeURIComponent(token ?? "")}&party=${encodeURIComponent(party)}&error=${errorMsg}`, 303);
    }
    if (!ALLOWED_MIME_TYPES.includes(fileBack.type)) {
      const errorMsg = encodeURIComponent("Invalid file type for back of photo ID. Only JPEG, PNG, or PDF allowed.");
      return NextResponse.redirect(`${baseUrl}/application/complete/${appId}?token=${encodeURIComponent(token ?? "")}&party=${encodeURIComponent(party)}&error=${errorMsg}`, 303);
    }
  }

  const uploadedAt = new Date().toISOString();

  const frontSafe = sanitizeFilename(fileFront.name || "photo-id-front");
  const frontBlobName = `tenancy-applications/${appId}/background-info/${party}/photo-id-front/${crypto.randomUUID()}-${frontSafe}`;
  const frontBlob = containerClient.getBlockBlobClient(frontBlobName);
  await frontBlob.uploadData(Buffer.from(await fileFront.arrayBuffer()), {
    blobHTTPHeaders: { blobContentType: fileFront.type || "application/octet-stream" },
  });

  let backUrl: string | undefined;
  let backBlobName: string | undefined;
  if (fileBack) {
    const backSafe = sanitizeFilename(fileBack.name || "photo-id-back");
    backBlobName = `tenancy-applications/${appId}/background-info/${party}/photo-id-back/${crypto.randomUUID()}-${backSafe}`;
    const backBlob = containerClient.getBlockBlobClient(backBlobName);
    await backBlob.uploadData(Buffer.from(await fileBack.arrayBuffer()), {
      blobHTTPHeaders: { blobContentType: fileBack.type || "application/octet-stream" },
    });
    backUrl = backBlob.url;
  }

  const submittedAt = new Date().toISOString();
  const backgroundInfo = {
    employmentStatus,
    employerName,
    employerEmail: employerEmail || undefined,
    previousEmployerName: previousEmployerName || undefined,
    previousEmployerEmail: previousEmployerEmail || undefined,
    employmentContractType: employmentContractType || undefined,
    jobTitle,
    monthlyIncome,
    employmentLength,
    prevLandlordName,
    prevLandlordContact,
    prevLandlordEmail: prevLandlordEmail || undefined,
    creditConsent,
    photoIdFrontFile: frontBlob.url,
    photoIdFrontBlobName: frontBlobName,
    photoIdBackFile: backUrl,
    photoIdBackBlobName: backBlobName,
    uploadedAt,
    submittedAt,
  };

  const nextStage2 = {
    ...application.stage2,
    ...(party === 'primary'
      ? {
          backgroundInfo,
          tokenUsed: true,
        }
      : {
          coTenant: {
            ...(application.stage2?.coTenant ?? {
              status: 'agreed',
              creditCheckConsent: false,
              socialMediaConsent: false,
              landlordReferenceConsent: false,
              employerReferenceConsent: false,
              creditCheck: { status: 'not_started' },
            }),
            backgroundInfo,
            tokenUsed: true,
          },
        }),
  };

  const primaryComplete = Boolean(nextStage2.backgroundInfo?.submittedAt);
  const coTenantRequired = Boolean(application.coTenant);
  const coTenantComplete = !coTenantRequired ? true : Boolean(nextStage2.coTenant?.backgroundInfo?.submittedAt);
  const allComplete = primaryComplete && coTenantComplete;

  await updateTenancyApplication(appId, {
    stage2: {
      ...nextStage2,
      status: allComplete ? 'complete' : String(nextStage2.status) === 'declined' ? 'declined' : 'agreed',
    },
    currentStage: allComplete ? 3 : (application.currentStage ?? 2),
  });

  return NextResponse.redirect(`${baseUrl}/application/complete/${appId}?submitted=1`, 303);
}
