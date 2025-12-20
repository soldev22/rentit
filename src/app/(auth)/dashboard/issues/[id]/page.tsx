import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getIssueDetailForManager } from "@/lib/maintenance/issues";
import IssueEditor from "../../../../../components/maintenance/IssueEditor";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerIssueDetailPage({ params }: PageProps) {
  const { id: issueId } = await params;

  const session = await getServerSession(authOptions);

  if (
    !session ||
    !["LANDLORD", "AGENT", "ADMIN"].includes(session.user.role)
  ) {
    notFound();
  }

  const issue = await getIssueDetailForManager(issueId);

  if (!issue) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Maintenance Issue</h1>
        <p className="text-sm text-slate-400">
          Logged on {issue.createdAtLabel}
        </p>
      </header>

      {/* HISTORY */}
      <section className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Update history</h3>

        <div className="max-h-72 overflow-y-auto w-full">
          {issue.descriptionHistory?.length ? (
            <ul className="space-y-1">
              {[...issue.descriptionHistory]
                .reverse()
                .map((item: any, index: number) => (
                  <li
                    key={index}
                    className={`rounded border px-3 py-2 ${
                      index === 0
                        ? "border-indigo-500/40 bg-indigo-500/10"
                        : "border-slate-800 bg-slate-950"
                    }`}
                  >
                    <div className="text-xs text-slate-400 mb-0.5">
                      <strong className="uppercase">{item.role}</strong>{" "}
                      ·{" "}
                      {new Date(item.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </div>

                    <div className="whitespace-pre-wrap text-sm text-slate-200">
                      {item.text}
                    </div>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No updates yet.</p>
          )}
        </div>
      </section>

      {/* EDITOR (shared component) */}
      <IssueEditor
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
