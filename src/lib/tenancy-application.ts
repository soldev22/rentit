import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";

export interface TenancyApplication {
  _id?: ObjectId;
  propertyId: ObjectId;
  applicantId?: ObjectId; // Optional for anonymous applications
  applicantName: string;
  applicantEmail: string;
  applicantTel: string;
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
  };

  // Stage 2: Background Checks Agreement
  stage2: {
    status: 'pending' | 'agreed' | 'declined';
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
      reportUrl?: string;
      checkedAt?: string;
    };
    backgroundInfo?: {
      employmentStatus: string;
      employerName: string;
      jobTitle: string;
      monthlyIncome: number;
      employmentLength: string;
      prevLandlordName: string;
      prevLandlordContact: string;
      creditConsent: boolean;
      photoIdFile: string;
      submittedAt: string;
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
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
  currentStage: 1 | 2 | 3 | 4 | 5 | 6;

  // Metadata
  createdAt: string;
  updatedAt: string;
  landlordId: ObjectId;
  assignedAgentId?: ObjectId;
}

// Helper functions for tenancy applications
export async function createTenancyApplication(application: Omit<TenancyApplication, '_id' | 'createdAt' | 'updatedAt'>) {
  const collection = await getCollection('tenancy_applications');
  const now = new Date().toISOString();

  const newApplication = {
    ...application,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(newApplication);
  return { ...newApplication, _id: result.insertedId };
}

export async function getTenancyApplicationById(id: string) {
  const collection = await getCollection('tenancy_applications');
  return await collection.findOne({ _id: new ObjectId(id) });
}

export async function updateTenancyApplication(id: string, updates: Partial<TenancyApplication>) {
  const collection = await getCollection('tenancy_applications');
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
  const collection = await getCollection('tenancy_applications');
  return await collection.find({ propertyId: new ObjectId(propertyId) }).toArray();
}

export async function getApplicationsByApplicant(applicantId: string) {
  const collection = await getCollection('tenancy_applications');
  return await collection.find({ applicantId: new ObjectId(applicantId) }).toArray();
}