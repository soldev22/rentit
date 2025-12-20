// src/app/tenant/report-issue/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getTenantPropertiesForIssue } from "@/lib/tenant/reportIssue";
import ReportIssueForm from "./ReportIssueForm";

export default async function ReportIssuePage() {
  const session = await getServerSession(authOptions);
  const tenantId = session!.user!.id!;

  const properties = await getTenantPropertiesForIssue(tenantId);

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <ReportIssueForm properties={properties} />
    </div>
  );
}
