import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ObjectId } from "mongodb";
import { getTenancyApplicationById, updateTenancyApplication } from "@/lib/tenancy-application";
import crypto from "crypto";
import { NotificationTemplates } from "@/lib/notification-templates";
import { getCollection } from "@/lib/db";
import { notificationService } from "@/lib/notification";

export async function POST(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "LANDLORD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appId } = await context.params;
  if (!ObjectId.isValid(appId)) {
    return NextResponse.json({ error: "Invalid application ID" }, { status: 400 });
  }

  const application = await getTenancyApplicationById(appId);
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (application.landlordId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ensure we have applicant contact details and explicit consent before proceeding.
  if (!application.applicantEmail || !application.applicantTel) {
    return NextResponse.json(
      { error: "Applicant email and phone number are required before requesting a background check." },
      { status: 400 }
    );
  }
  const hasAllConsents =
    application.stage2?.creditCheckConsent === true &&
    application.stage2?.socialMediaConsent === true &&
    application.stage2?.landlordReferenceConsent === true &&
    application.stage2?.employerReferenceConsent === true;
  if (!hasAllConsents) {
    return NextResponse.json(
      {
        error:
          "Cannot request background check: applicant has not granted all required consents (credit, social media, landlord reference, employer reference)."
      },
      { status: 400 }
    );
  }

  const token = crypto.randomBytes(32).toString("hex");
  const sentAt = new Date().toISOString();

  // Store token and sentAt in application.stage2
  await updateTenancyApplication(appId, {
    stage2: {
      ...application.stage2,
      sentAt,
      token,
    },
  });

  // Set tokenUsed and tokenExpiresAt (24h expiry for MVP)
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await updateTenancyApplication(appId, {
    stage2: {
      ...application.stage2,
      sentAt,
      token,
      tokenUsed: false,
      tokenExpiresAt,
    },
  });

  // Build the link for the applicant to complete background info
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000";
  const completeUrl = `${baseUrl}/application/complete/${appId}?token=${token}`;

  // Prepare notification content
  const subject = `Action Required: Complete your application for ${application.propertyId}`;
  const message = `Please complete your background information for your tenancy application.\n\nClick the link: ${completeUrl}\n\nIf you have questions, contact your landlord.`;

  // Send email
  await notificationService.sendNotification({
    to: application.applicantEmail,
    subject,
    message,
    method: 'email',
  });

  // Send SMS if phone is available
  if (application.applicantTel) {
    await notificationService.sendNotification({
      to: application.applicantTel,
      message: `RentIT: Please check your email (and spam folder) for a link to complete your application.`,
      method: 'sms',
    });
  }

  return NextResponse.json({ success: true, sentAt });
}
