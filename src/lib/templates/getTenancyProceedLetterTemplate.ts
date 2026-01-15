import { getActiveLetterTemplateText } from "@/lib/templates/getActiveLetterTemplateText";

export async function getActiveTenancyProceedLetterTemplateText(): Promise<string | null> {
  return getActiveLetterTemplateText({ kind: "TENANCY_PROCEED_LETTER", channel: "email" });
}
