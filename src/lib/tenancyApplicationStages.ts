export type TenancyApplicationStageNumber = 1 | 2 | 3 | 4 | 5 | 6;

export const TENANCY_APPLICATION_STAGE_LABELS: Record<
  TenancyApplicationStageNumber,
  string
> = {
  1: "Viewing",
  2: "Background Checks",
  3: "Document Pack",
  4: "Documents Signed",
  5: "Move-in Date Agreed",
  6: "Tenant Settled",
};

export function getTenancyApplicationStageLabel(
  stage: TenancyApplicationStageNumber
): string {
  return TENANCY_APPLICATION_STAGE_LABELS[stage];
}
