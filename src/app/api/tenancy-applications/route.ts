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

type QueryFilter = {
  landlordId?: ObjectId;
  applicantId?: ObjectId;
  assignedAgentId?: ObjectId;
  propertyId?: ObjectId;
};

// POST /api/tenancy-applications - Create new tenancy application
export async function POST(req: NextRequest) {
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
      backgroundCheckConsents,
      referenceContacts
    } = body;

    if (!propertyId || !applicantName || !applicantEmail || !applicantTel) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const consents = backgroundCheckConsents as
      | {
          creditCheck?: boolean;
          socialMedia?: boolean;
          landlordReference?: boolean;
          employerReference?: boolean;
        }
      | undefined;

    const hasAllConsents =
      consents?.creditCheck === true &&
      consents?.socialMedia === true &&
      consents?.landlordReference === true &&
      consents?.employerReference === true;

    if (!hasAllConsents) {
      return NextResponse.json(
        {
          error:
            "You must grant consent for Credit Check, Social Media, Landlord Reference, and Employer Reference to continue."
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    const invalidId = validateObjectId(propertyId, "propertyId");
    if (invalidId instanceof Response) return invalidId;

    // Get property to verify it exists and get landlord
    const properties = await getCollection('properties');
    const property = await properties.findOne({ _id: new ObjectId(propertyId) });
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
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

    const rc = (referenceContacts ?? {}) as Partial<NonNullable<TenancyApplication['stage2']>['referenceContacts']>;
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
      landlordId: property.landlordId,
      stage1: {
        status: stage1Status,
        viewingType: viewingType || null,
        agreedAt: viewingType ? new Date().toISOString() : undefined
      },
      stage2: {
        status: 'agreed',
        creditCheckConsent: true,
        socialMediaConsent: true,
        landlordReferenceConsent: true,
        employerReferenceConsent: true,
        agreedAt: new Date().toISOString(),
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

    // Send notification to applicant if logged in and has contact preferences
    if (session?.user?.email) {
      try {
        const users = await getCollection('users');
        const user = await users.findOne({ email: session.user.email });
        if (user?.profile?.contactPreferences) {
          const template = NotificationTemplates.applicationSubmitted(property.title);
          await notificationService.sendToUser(
            session.user.email,
            user.profile.phone,
            user.profile.contactPreferences,
            template.subject,
            template.message
          );
        }

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
      currentStage: application.currentStage
    });
  } catch (error) {
    console.error('Error creating tenancy application:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/tenancy-applications - Get applications (filtered by user role)
export async function GET(req: NextRequest) {
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