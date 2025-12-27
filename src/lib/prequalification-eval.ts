// Tenant Pre-Qualification Evaluation Logic (MVP)
// ----------------------------------------------
// This function contains all decision-making for tenant pre-qualification.
// It is intentionally simple and will be replaced by a real referencing provider integration.
// No database, HTTP, async, or UI logic. Pure function only.

import { PreQualificationStatus } from "@/types/tenant-prequalification";

/**
 * Input for pre-qualification evaluation.
 */
export interface PreQualificationInput {
  monthlyIncome: number;
  rentAmount: number;
  employmentStatus: string;
  selfDeclaredAdverseCredit: boolean;
}

/**
 * Output of pre-qualification evaluation.
 */
export interface PreQualificationResult {
  incomeToRentRatio: number;
  status: PreQualificationStatus;
}

/**
 * evaluateTenantPreQualification
 * MVP logic for tenant pre-qualification.
 * - Calculates incomeToRentRatio = monthlyIncome / rentAmount
 * - If income is below threshold, returns requires_review or failed
 * - If selfDeclaredAdverseCredit is true, returns requires_review
 * - Otherwise, returns pre_qualified
 *
 * This logic is intentionally simple and will be replaced by a provider integration.
 * No persistence or side effects.
 */
export function evaluateTenantPreQualification(input: PreQualificationInput): PreQualificationResult {
  const { monthlyIncome, rentAmount, selfDeclaredAdverseCredit } = input;
  const incomeToRentRatio = rentAmount > 0 ? monthlyIncome / rentAmount : 0;

  // MVP threshold: require at least 2.5x rent (can be changed later)
  const MIN_RATIO = 2.5;

  if (selfDeclaredAdverseCredit) {
    return { incomeToRentRatio, status: PreQualificationStatus.RequiresReview };
  }

  if (incomeToRentRatio < MIN_RATIO) {
    // For MVP, treat all below threshold as requires_review
    return { incomeToRentRatio, status: PreQualificationStatus.RequiresReview };
  }

  return { incomeToRentRatio, status: PreQualificationStatus.PreQualified };
}

// NOTE: This is the only file that changes when real referencing arrives.
// All business logic for pre-qualification is isolated here for easy replacement.
