import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { formatPropertyLabel } from "@/lib/formatPropertyLabel";

export const dynamic = "force-dynamic";

type ReportRow = {
  id: string;
  propertyLabel: string;
  savedAt?: string | null;
};

export default async function TenantViewingReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "TENANT") redirect("/dashboard");
  if (!session.user.id) redirect("/dashboard");

  const tenantObjectId = ObjectId.isValid(session.user.id) ? new ObjectId(session.user.id) : null;
  if (!tenantObjectId) redirect("/dashboard");

  const applications = await getCollection("tenancy_applications");
  const apps = await applications
    .find(
      { applicantId: tenantObjectId, "stage1.viewingSummary": { $exists: true } },
      {
        projection: {
          propertyId: 1,
          "stage1.viewingSummary.savedAt": 1,
          "stage1.viewingSummary.notes": 1,
          "stage1.viewingSummary.checklist": 1,
          "stage1.viewingSummary.photos": 1,
        },
      }
    )
    .sort({ createdAt: -1, _id: -1 })
    .toArray();

  const properties = await getCollection("properties");
  const reports: ReportRow[] = [];

  for (const a of apps as any[]) {
    const summary = a?.stage1?.viewingSummary;
    const hasAnything =
      Boolean(summary?.savedAt) ||
      (typeof summary?.notes === "string" && summary.notes.trim().length > 0) ||
      (Array.isArray(summary?.checklist) && summary.checklist.length > 0) ||
      (Array.isArray(summary?.photos) && summary.photos.length > 0);
    if (!hasAnything) continue;

    const propertyId = String(a?.propertyId || "");
    const property = ObjectId.isValid(propertyId)
      ? await properties.findOne(
          { _id: new ObjectId(propertyId) },
          { projection: { title: 1, address: 1 } }
        )
      : null;

    const title = typeof (property as any)?.title === "string" ? (property as any).title : undefined;
    const address = (property as any)?.address as
      | { line1?: string | null; city?: string | null; postcode?: string | null }
      | null
      | undefined;

    reports.push({
      id: String(a?._id),
      propertyLabel: formatPropertyLabel({ title, address }),
      savedAt: typeof summary?.savedAt === "string" ? summary.savedAt : null,
    });
  }

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Viewing reports</h1>
        <p className="text-sm text-slate-400">Viewing checklist, notes, and photos shared for your applications.</p>
      </header>

      <div>
        <Link href="/tenant/dashboard" className="text-sm text-indigo-300 hover:text-indigo-200">
          ← Back to dashboard
        </Link>
      </div>

      <section className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-4">
        {reports.length === 0 ? (
          <p className="text-sm text-slate-400">No viewing report available yet.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <Link
                key={r.id}
                href={`/tenant/viewing-reports/${r.id}#activity`}
                className="block rounded-lg border border-slate-800 bg-slate-950 p-3 hover:bg-slate-900"
              >
                <div className="font-medium">{r.propertyLabel}</div>
                {r.savedAt ? (
                  <div className="mt-1 text-xs text-slate-400">Saved: {new Date(r.savedAt).toLocaleString("en-GB")}</div>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
