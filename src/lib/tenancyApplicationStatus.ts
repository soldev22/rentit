import type { TenancyApplication } from "@/lib/tenancy-application";

export type UnifiedApplicationStatusView = {
  label: string;
  detail?: string;
};

function formatViewingDetails(stage1: TenancyApplication["stage1"]): string | undefined {
  const date = stage1.viewingDetails?.date || stage1.preferredDate;
  const time = stage1.viewingDetails?.time;
  const note = stage1.viewingDetails?.note;

  const dateTime = [date, time].filter(Boolean).join(" ").trim();
  const type = stage1.viewingType ? String(stage1.viewingType) : "";

  const parts: string[] = [];
  if (dateTime) parts.push(dateTime);
  if (type) parts.push(type);
  const head = parts.join(" ");

  if (head && note) return `${head} (${note})`;
  if (head) return head;
  if (note) return note;
  return undefined;
}

/**
 * Single source of truth for how we display tenancy application status.
 * This is shared between Landlord and Applicant/Tenant views.
 */
export function getUnifiedApplicationStatusView(
  application: Pick<
    TenancyApplication,
    "status" | "stage1" | "stage2" | "stage3" | "stage4" | "currentStage" | "coTenant"
  >
): UnifiedApplicationStatusView {
  const landlordDecisionStatus = application.stage2?.landlordDecision?.status;
  const landlordDecisionNotes = application.stage2?.landlordDecision?.notes;
  const stage2Status = String(application.stage2?.status);
  const stage2Complete = stage2Status === "complete";
  const stage2ApprovedAndNotified =
    landlordDecisionStatus === "pass" && Boolean(application.stage2?.landlordDecision?.notifiedAt);

  // Guard against stale terminal states that were set automatically earlier.
  // Example: credit-check route historically set application.status='rejected' on a failed check,
  // but if a landlord later records PASS for all checks, we want the UI to reflect the current checks.
  const primaryCheck = application.stage2?.creditCheck;
  const coCheck = application.coTenant ? application.stage2?.coTenant?.creditCheck : undefined;
  const primaryFailed = Boolean(primaryCheck && (primaryCheck.status === 'failed' || primaryCheck.passed === false));
  const coFailed = Boolean(coCheck && (coCheck.status === 'failed' || coCheck.passed === false));
  const hasAnyCreditFailure = primaryFailed || coFailed;

  if (application.status === "draft") {
    return { label: "Draft" };
  }

  // Terminal states
  if (application.status === "approved") {
    return { label: "Approved" };
  }
  if (application.status === "accepted") {
    return { label: "Accepted" };
  }
  if (landlordDecisionStatus === "fail") {
    return { label: "Can't proceed", detail: landlordDecisionNotes || "Landlord cannot proceed after review" };
  }
  if (application.status === "rejected" && hasAnyCreditFailure) {
    return { label: "Can't proceed" };
  }
  if (application.status === "refused") {
    return { label: "Can't proceed" };
  }
  if (application.status === "cancelled") {
    return { label: "Cancelled" };
  }
  if (application.status === "completed") {
    return { label: "Completed" };
  }

  // Prefer later stages if the application has progressed, even if earlier stage
  // status fields weren't updated consistently.
  if (application.currentStage >= 4) {
    if (
      application.stage4.status === "signed_online" ||
      application.stage4.status === "signed_physical" ||
      application.stage4.status === "completed"
    ) {
      return { label: "Agreement signed – processing" };
    }
    return { label: "Waiting for signed agreement" };
  }

  if (application.currentStage >= 3) {
    // Only surface Stage 3 as "current" once Stage 2 is truly complete/approved.
    // Some existing records may have currentStage=3 earlier in the flow.
    if (
      application.stage3.status === "pending" &&
      (stage2Complete || stage2ApprovedAndNotified)
    ) {
      return { label: "Ready to send document pack" };
    }
    if (application.stage3.status === "sent") {
      return { label: "Document pack sent – waiting for signed documents" };
    }
    if (application.stage3.status === "received") {
      return { label: "Signed documents received – waiting for signed agreement" };
    }
    // Stage 3 pending: fall through to Stage 2 logic.
  }

  if (application.currentStage >= 2) {
    // 4) Applicant Credit Check carried out
    const primaryCheck = application.stage2.creditCheck;
    const coCheck = application.coTenant ? application.stage2.coTenant?.creditCheck : undefined;

    const primaryScoreDetail = typeof primaryCheck.score === 'number' ? `Primary score: ${primaryCheck.score}` : undefined;
    const coScoreDetail = typeof coCheck?.score === 'number' ? `Co-tenant score: ${coCheck.score}` : undefined;
    const scoreDetail = [primaryScoreDetail, coScoreDetail].filter(Boolean).join(' · ') || undefined;

    const primaryFailed = primaryCheck.status === 'failed' || primaryCheck.passed === false;
    const coFailed = Boolean(coCheck && (coCheck.status === 'failed' || coCheck.passed === false));
    if (primaryFailed || coFailed) {
      const who = primaryFailed && coFailed ? ' (primary + co-tenant)' : primaryFailed ? ' (primary)' : ' (co-tenant)';
      return { label: `Credit check failed${who} – awaiting review`, detail: scoreDetail };
    }

    const primaryPassed = primaryCheck.status === 'completed' && primaryCheck.passed === true;
    const coPassed = Boolean(coCheck && coCheck.status === 'completed' && coCheck.passed === true);

    // If landlord has manually marked PASS, surface that as the most important message at Stage 2.
    if (landlordDecisionStatus === "pass") {
      return {
        label: "Background checks approved",
        detail: landlordDecisionNotes || scoreDetail,
      };
    }

    if (application.coTenant) {
      if (primaryPassed && coPassed) {
        return { label: 'Credit checks passed', detail: scoreDetail };
      }
      if (primaryPassed && !coPassed) {
        return { label: 'Primary credit check passed – waiting for co-tenant credit check', detail: scoreDetail };
      }
      if (!primaryPassed && coPassed) {
        return { label: 'Co-tenant credit check passed – waiting for primary credit check', detail: scoreDetail };
      }
    } else if (primaryCheck.status === 'completed') {
      if (primaryCheck.passed === true) {
        return { label: 'Credit check passed', detail: scoreDetail };
      }
      if (primaryCheck.passed === false) {
        return { label: 'Credit check failed – awaiting review', detail: scoreDetail };
      }
      return {
        label: 'Applicant credit check carried out',
        detail: scoreDetail
      };
    }

    // 3) Applicant wishes to proceed – waiting for signed financials
    // Some existing records use 'complete' here; treat it as 'agreed' for status display.
    const stage2Status = String(application.stage2.status);
    if (stage2Status === "agreed" || stage2Status === "complete") {
      return { label: "Applicant confirmed property – next steps in progress" };
    }
    // Stage 2 pending/declined: fall through to Stage 1.
  }

  const viewingSummary = application.stage1?.viewingSummary;
  if (viewingSummary?.applicantResponse?.status === "declined") {
    return { label: "Applicant not proceeding" };
  }
  if (viewingSummary?.applicantResponse?.status === "confirmed") {
    return { label: "Applicant confirmed property – ready for next steps" };
  }
  if (viewingSummary?.sentToApplicantAt && !viewingSummary?.applicantResponse) {
    return { label: "Awaiting applicant confirmation" };
  }

  // 1) Apply -> waiting for viewing
  // In our model Stage 1 is Viewing Agreement.
  // 2) Viewing Date Agreed – waiting for viewing
  if (application.stage1.status === "agreed") {
    const viewingDetail = formatViewingDetails(application.stage1);
    return {
      label: "Viewing date agreed – waiting for viewing",
      detail: viewingDetail
    };
  }

  if (application.stage1.status === "pending") {
    return { label: "Organising viewing" };
  }

  // Fallback to stage number if we have something unexpected
  return { label: `In progress (stage ${application.currentStage})` };
}
