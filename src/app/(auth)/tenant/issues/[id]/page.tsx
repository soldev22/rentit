import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getTenantIssueDetailById } from "@/lib/tenant/dashboard";
import TenantIssueEditor from "./tenantIssueEditor";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TenantIssueDetailPage({ params }: PageProps) {
  const { id: issueId } = await params;

  const session = await getServerSession(authOptions);
  const tenantId = session!.user!.id!;

  const issue = await getTenantIssueDetailById(tenantId, issueId);

  if (!issue) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Edit Issue</h1>
        <p className="text-sm text-slate-400">
          Logged on {issue.createdAtLabel}
        </p>
      </header>
      <section className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Update history</h3>
        <div className="max-h-64 overflow-y-auto w-full">
          {issue.descriptionHistory && issue.descriptionHistory.length > 0 ? (
            <ul className="space-y-1">
              {issue.descriptionHistory.map((item: any, index: number) => (
                <li
                  key={index}
                  className={`rounded border px-3 py-2 ${
                    index === issue.descriptionHistory.length - 1
                      ? "bg-white border-foreground text-foreground"
                      : "bg-gray-400 border-foreground text-foreground"
                  }`}
                >
                  <div className="text-sm text-gray-800 mb-1">
                    <strong className="uppercase">{item.role}</strong>
                    {" · "}
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                  <div className="whitespace-pre-wrap text-gray-900">
                    {item.text}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-200">No updates yet.</p>
          )}
        </div>
      </section>
      <TenantIssueEditor
        issue={{
          id: issue.id,
          title: issue.title,
          description: issue.description,
          status: issue.status,
        }}
      />
    </main>
  );
}
