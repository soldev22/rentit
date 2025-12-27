// Tenant Pre-Qualification MVP Types
// -----------------------------------
// This model defines the data contract for the tenant pre-qualification process.
// IMPORTANT: Field names, enum values, and structure must NOT change without a migration.
// This is a placeholder for integration with a real referencing provider in the future.
// Do NOT add logic, defaults, or database code here. Types only.

/**
 * PreQualificationStatus
 * Enum for the status of a tenant's pre-qualification process.
 * Do NOT change these values. Used for workflow and UI logic.
 */
export enum PreQualificationStatus {
  Pending = 'pending',
  PreQualified = 'pre_qualified',
  RequiresReview = 'requires_review',
  Failed = 'failed',
}

/**
 * TenantPreQualification
 * Data contract for a tenant's pre-qualification record.
 * All fields are required for MVP. Do NOT change field names or types without migration.
 */
export interface TenantPreQualification {
  tenantId: string; // Unique identifier for the tenant
  applicationId: string; // Associated tenancy application
  status: PreQualificationStatus; // Current pre-qualification status
  affordability: {
    monthlyIncome: number; // Declared monthly income
    rentAmount: number; // Monthly rent for the property
    incomeToRentRatio: number; // monthlyIncome / rentAmount
    employmentStatus: string; // e.g. 'employed', 'self_employed', 'unemployed', etc.
  };
  selfDeclaredAdverseCredit: boolean; // Tenant self-declaration only (not a credit check)
  consentGiven: boolean; // Has the tenant given consent for pre-qualification
  consentTimestamp: string; // ISO date string when consent was given
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// NOTE: This type is a strict contract for the MVP. Changing field names, types, or enum values
// will break downstream consumers and may cause data loss or workflow regressions.
// Replace this with a real referencing provider integration in the future.
