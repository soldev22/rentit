import { ObjectId, WithId } from "mongodb";
import { getCollection } from "@/lib/db";

export interface TenancyApplication {
  _id?: ObjectId;
  propertyId: ObjectId;
  applicantId?: ObjectId; // Optional for anonymous applications
  applicantName: string;
  applicantEmail: string;
  applicantTel: string;
  /** Optional second signatory (max 2 total). Added by the primary applicant after viewing. */
  coTenant?: {
    name: string;
    email: string;
    tel: string;
    addedAt: string;
  };
  applicantAddress?: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
  };
  isAnonymous: boolean;

  // Stage 1: Viewing Agreement
  stage1: {
    status: 'pending' | 'agreed' | 'declined';
    viewingType: 'onsite' | 'virtual' | null;
    preferredDate?: string;
    agreedAt?: string;
    viewingDetails?: {
      date?: string;
      time?: string;
      note?: string;
    };

    /**
     * Stage 1 viewing checklist + landlord notes, completed on-site and sent to the applicant
     * for confirmation (magic-link token).
     */
    viewingSummary?: {
      notes?: string;
      checklist?: Array<{
        key: string;
        label: string;
        checked: boolean;
        comment?: string;
      }>;

      /** Optional photos captured during/after the viewing (landlord uploaded). */
      photos?: Array<{
        url: string;
        blobName?: string;
        /** Optional checklist item key this photo relates to. */
        itemKey?: string;
        uploadedAt: string;
        uploadedBy?: ObjectId;
        fileName?: string;
        mimeType?: string;
        sizeBytes?: number;
      }>;

      savedAt?: string;
      completedAt?: string;
      completedBy?: ObjectId;

      /** Landlord-toggled flag indicating the viewing took place. */
      viewingOccurred?: boolean;
      /** Timestamp recorded when landlord marks the viewing as occurred. */
      viewingOccurredAt?: string | null;

      sentToApplicantAt?: string;
      /** Landlord-only override to allow editing after sending. */
      editingUnlockedAt?: string;
      editingUnlockedBy?: ObjectId;
      confirmationTokenHash?: string;
      confirmationTokenExpiresAt?: string;
      confirmationTokenUsedAt?: string;

      applicantResponse?: {
        status: 'confirmed' | 'declined' | 'query';
        respondedAt: string;
        comment?: string;
      };
    };
  };

  // Stage 2: Background Checks Agreement
  stage2: {
    status: 'pending' | 'agreed' | 'declined' | 'complete';

    /**
     * Defensible letter sent after Stage 1 consent to proceed.
     * Draft is editable until sent; send operation stores the exact content.
     */
    proceedLetter?: {
      subject?: string;
      content?: string;
      savedAt?: string;
      sentAt?: string;
      sentBy?: ObjectId;
      sentToEmail?: string;
      sentToSms?: string | null;
      delivery?: {
        email: boolean;
        sms: boolean;
      };
    };

    /**
     * Optional landlord decision after reviewing Stage 2 checks.
     * This is the landlord's manual PASS/FAIL, separate from automated checks.
     */
    landlordDecision?: {
      status: 'pending' | 'pass' | 'fail';
      notes?: string;
      decidedAt?: string;
      decidedBy?: ObjectId;
      notifiedAt?: string;
      notifiedContent?: {
        subject?: string;
        message?: string;
        smsMessage?: string;
        sendSms?: boolean;
      };
      notifiedTo?: {
        primaryEmail?: string;
        primarySms?: string;
        coTenantEmail?: string;
        coTenantSms?: string;
      };
    };
    creditCheckConsent: boolean;
    socialMediaConsent: boolean;
    landlordReferenceConsent: boolean;
    employerReferenceConsent: boolean;
    agreedAt?: string;
    sentAt?: string;
    token?: string;
    tokenUsed?: boolean;
    tokenExpiresAt?: string;
    creditCheck: {
      status: 'not_started' | 'in_progress' | 'completed' | 'failed';
      score?: number;
      ccjCount?: number;
      passed?: boolean;
      failureReason?: string;
      reportUrl?: string;
      checkedAt?: string;
    };

    employerVerification?: {
      status: 'not_started' | 'requested' | 'received';
      requestedAt?: string;
      token?: string;
      tokenUsed?: boolean;
      tokenExpiresAt?: string;
      response?: {
        employed?: boolean;
        nonZeroHoursContract?: boolean;
        contractType?: string;
        startDate?: string;
        comments?: string;
        submittedAt: string;
      };
    };

    previousLandlordReference?: {
      status: 'not_started' | 'requested' | 'received';
      requestedAt?: string;
      token?: string;
      tokenUsed?: boolean;
      tokenExpiresAt?: string;
      response?: {
        wouldRentAgain?: boolean;
        paidOnTime?: boolean;
        arrears?: boolean;
        comments?: string;
        submittedAt: string;
      };
    };

    referenceContacts?: {
      employerName?: string;
      employerEmail?: string;
      previousEmployerName?: string;
      previousEmployerEmail?: string;
      prevLandlordName?: string;
      prevLandlordContact?: string;
      prevLandlordEmail?: string;
      updatedAt?: string;
      source?: 'profile' | 'application' | 'landlord';
    };

    backgroundInfo?: {
      employmentStatus: string;
      employerName: string;
      employerEmail?: string;
      previousEmployerName?: string;
      previousEmployerEmail?: string;
      employmentContractType?: string;
      jobTitle: string;
      monthlyIncome: number;
      employmentLength: string;
      prevLandlordName: string;
      prevLandlordContact: string;
      prevLandlordEmail?: string;
      creditConsent: boolean;
      photoIdFile?: string;
      submittedAt: string;
      photoIdFrontFile?: string;
      photoIdBackFile?: string;
    };

    /** Optional Stage 2 data for the co-tenant (second signatory). */
    coTenant?: {
      status: 'pending' | 'agreed' | 'declined' | 'complete';
      creditCheckConsent: boolean;
      socialMediaConsent: boolean;
      landlordReferenceConsent: boolean;
      employerReferenceConsent: boolean;
      agreedAt?: string;
      sentAt?: string;
      token?: string;
      tokenUsed?: boolean;
      tokenExpiresAt?: string;
      creditCheck: {
        status: 'not_started' | 'in_progress' | 'completed' | 'failed';
        score?: number;
        ccjCount?: number;
        passed?: boolean;
        failureReason?: string;
        reportUrl?: string;
        checkedAt?: string;
      };

      employerVerification?: TenancyApplication['stage2']['employerVerification'];
      previousLandlordReference?: TenancyApplication['stage2']['previousLandlordReference'];
      referenceContacts?: TenancyApplication['stage2']['referenceContacts'];
      backgroundInfo?: TenancyApplication['stage2']['backgroundInfo'];
    };
  };

  // Stage 3: Document Pack
  stage3: {
    status: 'pending' | 'sent' | 'received';
    deliveryMethod: 'email' | 'recorded_delivery' | null;
    sentAt?: string;
    trackingNumber?: string;
    documents: {
      tenancyAgreement: boolean;
      gasSafetyCertificate: boolean;
      epcCertificate: boolean;
      inventoryChecklist: boolean;
      otherDocuments: string[];
    };
  };

  // Stage 4: Document Signing
  stage4: {
    status: 'pending' | 'signed_online' | 'signed_physical' | 'completed';
    onlineSignature?: {
      signedAt: string;
      ipAddress: string;
      userAgent: string;
      signatureData: string; // Base64 encoded signature
    };
    /** New: supports up to 2 signatories (primary + co-tenant). */
    onlineSignatures?: {
      primary?: {
        signedAt: string;
        ipAddress: string;
        userAgent: string;
        signatureData: string; // Base64 encoded signature
      };
      coTenant?: {
        signedAt: string;
        ipAddress: string;
        userAgent: string;
        signatureData: string; // Base64 encoded signature
      };
    };
    physicalSignatureReceived?: string;
    hardCopySent?: string;
  };

  // Stage 5: Move-in Date
  stage5: {
    status: 'pending' | 'scheduled' | 'confirmed';
    moveInDate?: string;
    confirmedAt?: string;
  };

  // Stage 6: Final Documentation
  stage6: {
    status: 'pending' | 'sent' | 'completed';
    inventoryCompleted: boolean;
    finalDocumentsSent: boolean;
    keysHandedOver: boolean;
    completedAt?: string;
  };

  // Overall status
  status:
    | 'draft'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'rejected'
    | 'approved'
    | 'accepted'
    | 'refused';
  currentStage: 1 | 2 | 3 | 4 | 5 | 6;

  // Metadata
  createdAt: string;
  updatedAt: string;
  landlordId: ObjectId;
  assignedAgentId?: ObjectId;
}

// Helper functions for tenancy applications
export async function createTenancyApplication(application: Omit<TenancyApplication, '_id' | 'createdAt' | 'updatedAt'>) {
  const collection = await getCollection<TenancyApplication>('tenancy_applications');
  const now = new Date().toISOString();

  const newApplication = {
    ...application,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(newApplication);
  return { ...newApplication, _id: result.insertedId };
}

export async function getTenancyApplicationById(id: string): Promise<WithId<TenancyApplication> | null> {
  const collection = await getCollection<TenancyApplication>('tenancy_applications');
  return await collection.findOne({ _id: new ObjectId(id) });
}

export async function updateTenancyApplication(id: string, updates: Partial<TenancyApplication>) {
  const collection = await getCollection<TenancyApplication>('tenancy_applications');
  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...updates,
        updatedAt: new Date().toISOString()
      }
    }
  );
  return result.modifiedCount > 0;
}

export async function getApplicationsByProperty(propertyId: string) {
  const collection = await getCollection<TenancyApplication>('tenancy_applications');
  return await collection.find({ propertyId: new ObjectId(propertyId) }).toArray();
}

export async function getApplicationsByApplicant(applicantId: string) {
  const collection = await getCollection<TenancyApplication>('tenancy_applications');
  return await collection.find({ applicantId: new ObjectId(applicantId) }).toArray();
}