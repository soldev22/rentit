import type { TenancyApplication } from "@/lib/tenancy-application";

export type UnifiedApplicationStatusView = {
  label: string;
  detail?: string;
};

function formatViewingDetails(stage1: TenancyApplication["stage1"]): string | undefined {
  const date = stage1.viewingDetails?.date;
  const time = stage1.viewingDetails?.time;
  const note = stage1.viewingDetails?.note;

  const dateTime = [date, time].filter(Boolean).join(" ").trim();
  if (dateTime && note) return `${dateTime} (${note})`;
  if (dateTime) return dateTime;
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
    "status" | "stage1" | "stage2" | "stage3" | "stage4" | "currentStage"
  >
): UnifiedApplicationStatusView {
  if (application.status === "draft") {
    return { label: "Draft" };
  }

  // Terminal states
  if (application.status === "rejected") {
    return { label: "Rejected" };
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
    if (application.stage3.status === "sent") {
      return { label: "Financials sent – waiting for signed financials" };
    }
    if (application.stage3.status === "received") {
      return { label: "Signed financials received – waiting for signed agreement" };
    }
    // Stage 3 pending: fall through to Stage 2 logic.
  }

  if (application.currentStage >= 2) {
    // 4) Applicant Credit Check carried out – waiting for signed agreement
    if (application.stage2.creditCheck.status === "completed") {
      return { label: "Applicant credit check carried out – waiting for signed agreement" };
    }

    // 3) Applicant wishes to proceed – waiting for signed financials
    // Some existing records use 'complete' here; treat it as 'agreed' for status display.
    const stage2Status = String(application.stage2.status);
    if (stage2Status === "agreed" || stage2Status === "complete") {
      return { label: "Applicant wishes to proceed – waiting for signed financials" };
    }
    // Stage 2 pending/declined: fall through to Stage 1.
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
    return { label: "Application complete – waiting for viewing" };
  }

  // Fallback to stage number if we have something unexpected
  return { label: `In progress (stage ${application.currentStage})` };
}
