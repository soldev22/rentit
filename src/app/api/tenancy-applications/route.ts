import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { requireSession, validateObjectId, checkDuplicate } from "@/lib/api-utils";
import {
  createTenancyApplication,
  TenancyApplication
} from "@/lib/tenancy-application";
import { notificationService } from "@/lib/notification";
import { NotificationTemplates } from "@/lib/notification-templates";
import { withApiAudit } from "@/lib/api/withApiAudit";
import { formatPropertyLabel } from "@/lib/formatPropertyLabel";

type QueryFilter = {
  landlordId?: ObjectId;
  applicantId?: ObjectId;
  assignedAgentId?: ObjectId;
  propertyId?: ObjectId;
};

type PropertyDoc = {
  title?: string;
  landlordId?: ObjectId | string;
};

type LandlordDoc = {
  email?: string;
  tel?: string;
  phone?: string;
  profile?: {
    phone?: string;
  };
};

// POST /api/tenancy-applications - Create new tenancy application
async function createApplication(req: NextRequest) {
  try {
    // Validate session
    const session = await requireSession(req);
    if (session instanceof Response) return session;

    const body = await req.json();
    const {
      propertyId,
      applicantName,
      applicantEmail,
      applicantTel,
      applicantAddress,
      viewingType,
      referenceContacts
    } = body;
      const contactPreferences = body.contactPreferences; // Added line for contact preferences

    if (!propertyId || !applicantName || !applicantEmail || !applicantTel) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate ObjectId
    const invalidId = validateObjectId(propertyId, "propertyId");
    if (invalidId instanceof Response) return invalidId;

    // Get property to verify it exists and get landlord
    const properties = await getCollection('properties');
    const property = (await properties.findOne({ _id: new ObjectId(propertyId) })) as unknown as PropertyDoc | null;
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const landlordIdRaw = property.landlordId;
    const landlordId =
      landlordIdRaw instanceof ObjectId
        ? landlordIdRaw
        : typeof landlordIdRaw === 'string' && ObjectId.isValid(landlordIdRaw)
          ? new ObjectId(landlordIdRaw)
          : null;

    if (!landlordId) {
      return NextResponse.json(
        { error: 'Property is missing a valid landlordId' },
        { status: 500 }
      );
    }

    // Check for duplicate application
    const applications = await getCollection('tenancy_applications');
    const duplicate = await checkDuplicate(
      applications,
      {
        propertyId: new ObjectId(propertyId),
        applicantEmail: applicantEmail.toLowerCase(),
        status: { $in: ['draft', 'in_progress'] }
      },
      "You already have an active application for this property"
    );
    if (duplicate instanceof Response) return duplicate;

    // Create the tenancy application
    const stage1Status = viewingType ? 'agreed' : 'pending';

    type ReferenceContacts = NonNullable<TenancyApplication['stage2']['referenceContacts']>;

    const rc: Partial<ReferenceContacts> =
      typeof referenceContacts === 'object' && referenceContacts !== null
        ? (referenceContacts as Partial<ReferenceContacts>)
        : {};
    const clean = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 200) : undefined);
    const nextReferenceContacts = {
      employerName: clean(rc.employerName),
      employerEmail: clean(rc.employerEmail),
      previousEmployerName: clean(rc.previousEmployerName),
      previousEmployerEmail: clean(rc.previousEmployerEmail),
      prevLandlordName: clean(rc.prevLandlordName),
      prevLandlordContact: clean(rc.prevLandlordContact),
      prevLandlordEmail: clean(rc.prevLandlordEmail),
      updatedAt: new Date().toISOString(),
      source: 'application' as const,
    };

    const hasAnyReferenceContact = Object.values(nextReferenceContacts).some(
      (v) => typeof v === 'string' && v.length > 0
    );

    const application: Omit<TenancyApplication, '_id' | 'createdAt' | 'updatedAt'> = {
      propertyId: new ObjectId(propertyId),
      applicantId: session?.user?.id ? new ObjectId(session.user.id) : undefined,
      applicantName,
      applicantEmail: applicantEmail.toLowerCase(),
      applicantTel,
      applicantAddress,
      isAnonymous: !session?.user?.id,
      landlordId,
      stage1: {
        status: stage1Status,
        viewingType: viewingType || null,
        agreedAt: viewingType ? new Date().toISOString() : undefined
      },
      stage2: {
        status: 'pending',
        creditCheckConsent: false,
        socialMediaConsent: false,
        landlordReferenceConsent: false,
        employerReferenceConsent: false,
        creditCheck: {
          status: 'not_started'
        },
        referenceContacts: hasAnyReferenceContact ? nextReferenceContacts : undefined,
      },
      stage3: {
        status: 'pending',
        deliveryMethod: null,
        documents: {
          tenancyAgreement: false,
          gasSafetyCertificate: false,
          epcCertificate: false,
          inventoryChecklist: false,
          otherDocuments: []
        }
      },
      stage4: {
        status: 'pending'
      },
      stage5: {
        status: 'pending'
      },
      stage6: {
        status: 'pending',
        inventoryCompleted: false,
        finalDocumentsSent: false,
        keysHandedOver: false
      },
      status: 'in_progress',
      currentStage: stage1Status === 'agreed' ? 3 : 1
    };

    const result = await createTenancyApplication(application);

    // Notify landlord via email + SMS (best-effort)
    const notificationResults = {
      landlordEmail: false,
      landlordSms: false,
      applicantNotification: false,
    };

    try {
      const users = await getCollection('users');

      const applicantEmailLower = applicantEmail.toLowerCase();

      const landlordIdRaw = property.landlordId;
      const landlordId = typeof landlordIdRaw === 'string' && ObjectId.isValid(landlordIdRaw)
        ? new ObjectId(landlordIdRaw)
        : landlordIdRaw instanceof ObjectId
          ? landlordIdRaw
          : null;

      if (landlordId) {
        const landlord = (await users.findOne({ _id: landlordId })) as unknown as LandlordDoc | null;
        const landlordEmail = typeof landlord?.email === 'string' ? landlord.email : null;
        const landlordPhoneRaw =
          (typeof landlord?.profile?.phone === 'string' && landlord.profile.phone) ||
          (typeof landlord?.tel === 'string' && landlord.tel) ||
          (typeof landlord?.phone === 'string' && landlord.phone) ||
          null;

        const normalizePhoneToE164 = (raw: string): string | null => {
          const trimmed = raw.trim();
          if (!trimmed) return null;

          // Keep leading '+' if present, strip everything else that's not a digit.
          const cleaned = trimmed
            .replace(/\(0\)/g, '')
            .replace(/[^\d+]/g, '');

          let e164 = cleaned;
          if (e164.startsWith('00')) e164 = '+' + e164.slice(2);

          // UK-centric normalization:
          //  - 07xxxxxxxxx or 0xxxxxxxxxx => +44xxxxxxxxxx
          if (!e164.startsWith('+')) {
            if (e164.startsWith('0')) {
              e164 = '+44' + e164.slice(1);
            } else if (e164.startsWith('44')) {
              e164 = '+' + e164;
            } else {
              e164 = '+' + e164;
            }
          }

          // Final validation (E.164 max 15 digits).
          if (!/^\+\d{8,15}$/.test(e164)) return null;
          return e164;
        };

        const propertyLabel = formatPropertyLabel(property as any);
        const subject = `New viewing request: ${propertyLabel}`;
        const message =
          `A new applicant has requested a viewing for ${propertyLabel}.\n` +
          `Name: ${applicantName}\n` +
          `Email: ${applicantEmailLower}` +
          (applicantTel ? `\nTel: ${applicantTel}` : '') +
          `\n\nLog in to your landlord dashboard to review and confirm the viewing.`;

        if (landlordEmail) {
          const ok = await notificationService.sendNotification({
            to: landlordEmail,
            subject,
            message,
            method: 'email',
          });
          notificationResults.landlordEmail = ok;
          if (!ok) {
            console.error('Landlord email notification failed');
          }
        }

        if (landlordPhoneRaw) {
          const smsTo = normalizePhoneToE164(landlordPhoneRaw);
          if (!smsTo) {
            console.error('Landlord SMS not sent: invalid phone number format');
          } else {
            const ok = await notificationService.sendNotification({
              to: smsTo,
              message,
              method: 'sms',
            });
            notificationResults.landlordSms = ok;
            if (!ok) {
              console.error('Landlord SMS notification failed');
            }
          }
        }
      }
    } catch (landlordNotifyError) {
      console.error('Error notifying landlord of application:', landlordNotifyError);
    }

    // Send notification to applicant if logged in and has contact preferences
    if (session?.user?.email) {
      try {
        const users = await getCollection('users');
        const user = await users.findOne({ email: session.user.email });
        const cleanContactPreferences = (v: unknown) => {
          if (!v || typeof v !== 'object') return undefined;
          const anyV = v as any;
          const email = anyV.email;
          const sms = anyV.sms;
          const whatsapp = anyV.whatsapp;
          if (typeof email !== 'boolean' || typeof sms !== 'boolean' || typeof whatsapp !== 'boolean') return undefined;
          return { email, sms, whatsapp };
        };

        const requestedContactPreferences = cleanContactPreferences(contactPreferences);

        const prefsToUse =
          requestedContactPreferences ||
          (user as any)?.profile?.contactPreferences ||
          { email: true, sms: false, whatsapp: false };

        const userPhone = (user as any)?.profile?.phone as string | undefined;

        if (requestedContactPreferences) {
          await users.updateOne(
            { email: session.user.email },
            {
              $set: {
                'profile.contactPreferences': requestedContactPreferences,
              },
            }
          );
        }

        const propertyLabelForEmail = formatPropertyLabel(property as any);
        const emailTemplate = NotificationTemplates.viewingRequestSentEmail(propertyLabelForEmail);
        const smsTemplate = NotificationTemplates.viewingRequestSentSms();

        const sendEmail = Boolean(prefsToUse?.email);
        const sendSms = Boolean(prefsToUse?.sms) && Boolean(userPhone);

        const emailOk = sendEmail
          ? await notificationService.sendNotification({
              to: session.user.email,
              subject: emailTemplate.subject,
              message: emailTemplate.message,
              method: 'email',
            })
          : false;

        const smsOk = sendSms
          ? await notificationService.sendNotification({
              to: userPhone as string,
              message: smsTemplate.message,
              method: 'sms',
            })
          : false;

        // WhatsApp sending is disabled in NotificationService; keep flag false.
        notificationResults.applicantNotification = Boolean(emailOk || smsOk);

        // Persist reference contacts into profile for auto-fill next time
        if (hasAnyReferenceContact) {
          const setOps: Record<string, unknown> = {};
          if (nextReferenceContacts.employerName) setOps['profile.backgroundCheck.employerName'] = nextReferenceContacts.employerName;
          if (nextReferenceContacts.employerEmail) setOps['profile.backgroundCheck.employerEmail'] = nextReferenceContacts.employerEmail;
          if (nextReferenceContacts.previousEmployerName) setOps['profile.backgroundCheck.previousEmployerName'] = nextReferenceContacts.previousEmployerName;
          if (nextReferenceContacts.previousEmployerEmail) setOps['profile.backgroundCheck.previousEmployerEmail'] = nextReferenceContacts.previousEmployerEmail;
          if (nextReferenceContacts.prevLandlordName) setOps['profile.backgroundCheck.prevLandlordName'] = nextReferenceContacts.prevLandlordName;
          if (nextReferenceContacts.prevLandlordContact) setOps['profile.backgroundCheck.prevLandlordContact'] = nextReferenceContacts.prevLandlordContact;
          if (nextReferenceContacts.prevLandlordEmail) setOps['profile.backgroundCheck.prevLandlordEmail'] = nextReferenceContacts.prevLandlordEmail;
          setOps['profile.backgroundCheck.updatedAt'] = new Date().toISOString();

          if (Object.keys(setOps).length > 0) {
            await users.updateOne(
              { email: session.user.email },
              {
                $set: setOps,
              }
            );
          }
        }
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      applicationId: result._id?.toString(),
      currentStage: application.currentStage,
      message: "Viewing request sent successfully",
      notificationResults,
    });
  } catch (error) {
    console.error('Error creating tenancy application:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/tenancy-applications - Get applications (filtered by user role)
async function listApplications(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');
    const applicantId = searchParams.get('applicantId');

    const applications = await getCollection('tenancy_applications');
    const query: QueryFilter = {};

    // Filter based on user role
    if (session.user.role === 'LANDLORD') {
      query.landlordId = new ObjectId(session.user.id);
    } else if (session.user.role === 'TENANT' || session.user.role === 'APPLICANT') {
      query.applicantId = new ObjectId(session.user.id);
    } else if (session.user.role === 'AGENT') {
      query.assignedAgentId = new ObjectId(session.user.id);
    }

    if (propertyId) {
      query.propertyId = new ObjectId(propertyId);
    }

    if (applicantId) {
      query.applicantId = new ObjectId(applicantId);
    }

    const results = await applications.find(query).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({ applications: results });

  } catch (error) {
    console.error('Error fetching tenancy applications:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = withApiAudit(createApplication);
export const GET = withApiAudit(listApplications);