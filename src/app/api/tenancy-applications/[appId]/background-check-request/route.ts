import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ObjectId } from "mongodb";
import { getTenancyApplicationById, updateTenancyApplication } from "@/lib/tenancy-application";
import crypto from "crypto";
import { notificationService } from "@/lib/notification";
import { withApiAudit } from "@/lib/api/withApiAudit";
import { mirrorCommsToLandlord } from "@/lib/mirrorCommsToLandlord";

async function requestBackgroundCheck(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "LANDLORD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partyParam = req.nextUrl.searchParams.get('party');
  const party: 'primary' | 'coTenant' | 'both' =
    partyParam === 'primary' || partyParam === 'coTenant' ? partyParam : 'both';

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
  const sendPrimary = party === 'both' || party === 'primary';
  const sendCoTenant = party === 'both' || party === 'coTenant';

  if (sendPrimary) {
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
  }

  const sentAt = new Date().toISOString();
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000";

  const hasCoTenant = Boolean(application.coTenant);
  const coTenantStage2 = application.stage2?.coTenant;

  if (sendCoTenant) {
    if (!hasCoTenant) {
      return NextResponse.json({ error: 'No co-tenant exists for this application.' }, { status: 400 });
    }

    if (!application.coTenant?.email || !application.coTenant?.tel) {
      return NextResponse.json(
        { error: 'Co-tenant email and phone number are required before requesting a background check.' },
        { status: 400 }
      );
    }

    const coHasAllConsents =
      coTenantStage2?.creditCheckConsent === true &&
      coTenantStage2?.socialMediaConsent === true &&
      coTenantStage2?.landlordReferenceConsent === true &&
      coTenantStage2?.employerReferenceConsent === true;

    if (!coHasAllConsents) {
      return NextResponse.json(
        {
          error:
            'Cannot request background check for co-tenant: co-tenant has not granted all required consents (credit, social media, landlord reference, employer reference).'
        },
        { status: 400 }
      );
    }
  }

  const primaryToken = sendPrimary ? crypto.randomBytes(32).toString('hex') : null;
  const primaryCompleteUrl =
    sendPrimary && primaryToken
      ? `${baseUrl}/application/complete/${appId}?token=${primaryToken}&party=primary`
      : null;

  const coTenantToken = sendCoTenant && hasCoTenant ? crypto.randomBytes(32).toString('hex') : null;
  const coTenantCompleteUrl =
    sendCoTenant && hasCoTenant && coTenantToken
      ? `${baseUrl}/application/complete/${appId}?token=${coTenantToken}&party=coTenant`
      : null;

  await updateTenancyApplication(appId, {
    stage2: {
      ...application.stage2,
      ...(sendPrimary
        ? {
            sentAt,
            token: primaryToken ?? undefined,
            tokenUsed: false,
            tokenExpiresAt,
          }
        : {}),
      coTenant: sendCoTenant
        ? {
            ...(coTenantStage2 ?? {
              status: 'agreed',
              creditCheckConsent: false,
              socialMediaConsent: false,
              landlordReferenceConsent: false,
              employerReferenceConsent: false,
              creditCheck: { status: 'not_started' },
            }),
            sentAt,
            token: coTenantToken ?? undefined,
            tokenUsed: false,
            tokenExpiresAt,
          }
        : coTenantStage2,
    },
  });

  // Prepare notification content
  if (sendPrimary && primaryCompleteUrl) {
    const subject = `Action Required: Complete your application for ${application.propertyId}`;
    const message = `Please complete your background information for your tenancy application.\n\nClick the link: ${primaryCompleteUrl}\n\nIf you have questions, contact your landlord.`;

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
  }

  if (sendCoTenant && hasCoTenant && application.coTenant?.email && coTenantCompleteUrl) {
    const coSubject = `Action Required: Complete your tenancy application for ${application.propertyId}`;
    const coMessage =
      `Please complete your background information as a co-tenant for this tenancy application.\n\n` +
      `Click the link: ${coTenantCompleteUrl}\n\n` +
      `If you have questions, contact the primary applicant or the landlord.`;

    await notificationService.sendNotification({
      to: application.coTenant.email,
      subject: coSubject,
      message: coMessage,
      method: 'email',
    });
  }

  if (sendCoTenant && hasCoTenant && application.coTenant?.tel) {
    await notificationService.sendNotification({
      to: application.coTenant.tel,
      message: `RentIT: Please check your email (and spam folder) for a link to complete your co-tenant application.`,
      method: 'sms',
    });
  }

  // Mirror comms to landlord (receipt). Do NOT include token URLs.
  await mirrorCommsToLandlord({
    landlordUserId: session.user.id,
    subject: "Copy: Background check request sent",
    message:
      `This is a copy for your records.\n\n` +
      `Application: ${appId}\n` +
      `Sent at: ${sentAt}\n` +
      `Recipients: ` +
      `${sendPrimary ? "primary applicant" : ""}` +
      `${sendPrimary && sendCoTenant ? " and " : ""}` +
      `${sendCoTenant ? "co-tenant" : ""}` +
      `\n\n` +
      `Note: Secure completion links are not included in this copy.`,
    smsMessage: "Copy: Background check request sent (links omitted).",
  }).catch(() => undefined);

  return NextResponse.json({
    success: true,
    sentAt,
    sent: { primary: Boolean(sendPrimary), coTenant: Boolean(sendCoTenant && hasCoTenant) },
  });
}

export const POST = withApiAudit(requestBackgroundCheck);
