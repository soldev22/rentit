import { NextRequest, NextResponse } from "next/server";
import { getTenancyApplicationById, updateTenancyApplication } from "@/lib/tenancy-application";
import { ObjectId } from "mongodb";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs"; // Required for file upload

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

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000";
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

  // Save uploaded files to /public/uploads (or another secure location)
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  // Save front
  const fileExtFront = fileFront.name.split(".").pop();
  const fileNameFront = `photoid_front_${appId}_${Date.now()}.${fileExtFront}`;
  const filePathFront = path.join(uploadsDir, fileNameFront);
  const arrayBufferFront = await fileFront.arrayBuffer();
  await fs.writeFile(filePathFront, Buffer.from(arrayBufferFront));
  // Save back if present
  let fileNameBack: string | null = null;
  if (fileBack) {
    const fileExtBack = fileBack.name.split(".").pop();
    fileNameBack = `photoid_back_${appId}_${Date.now()}.${fileExtBack}`;
    const filePathBack = path.join(uploadsDir, fileNameBack);
    const arrayBufferBack = await fileBack.arrayBuffer();
    await fs.writeFile(filePathBack, Buffer.from(arrayBufferBack));
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
    photoIdFrontFile: `/uploads/${fileNameFront}`,
    photoIdBackFile: fileNameBack ? `/uploads/${fileNameBack}` : undefined,
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
