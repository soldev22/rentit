// src/app/tenant/dashboard/page.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getTenantDashboardData } from "../../../../lib/tenant/dashboard";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { formatPropertyLabel } from "@/lib/formatPropertyLabel";

export default async function TenantDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    // Keep it simple here; tenant pages are protected routes.
    // We send the user to login and let NextAuth handle the callback.
    // (Matches the project’s general pattern for role dashboards.)
    return (
      <main className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">Tenant Dashboard</h1>
          <p className="text-sm text-slate-400">Please sign in to continue.</p>
        </header>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 active:bg-indigo-700"
        >
          Sign in
        </Link>
      </main>
    );
  }

  if (session.user.role !== "TENANT") {
    return (
      <main className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">Tenant Dashboard</h1>
          <p className="text-sm text-slate-400">You don’t have access to this page.</p>
        </header>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Go to dashboard
        </Link>
      </main>
    );
  }

  const tenantId = session.user.id;

  const data = await getTenantDashboardData(tenantId);

  // Viewing reports are stored on the tenancy application under stage1.viewingSummary.
  // Tenants can view reports for their own applications.
  const tenantObjectId = ObjectId.isValid(tenantId) ? new ObjectId(tenantId) : null;
  const viewingReports: Array<{ id: string; propertyLabel: string; savedAt?: string | null }> = [];

  if (tenantObjectId) {
    const applications = await getCollection("tenancy_applications");
    const apps = await applications
      .find(
        {
          applicantId: tenantObjectId,
          "stage1.viewingSummary": { $exists: true },
        },
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
      .limit(5)
      .toArray();

    const properties = await getCollection("properties");
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

      viewingReports.push({
        id: String(a?._id),
        propertyLabel: formatPropertyLabel({ title, address }),
        savedAt: typeof summary?.savedAt === "string" ? summary.savedAt : null,
      });
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Tenant Dashboard</h1>
        <p className="text-sm text-slate-400">
          Quick overview and issue reporting
        </p>
      </header>

      <section className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-4">
        <h2 className="font-medium">Your Tenancy</h2>

        {data.activeTenancy ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Property</div>
              <div className="font-medium">{data.propertyLabel}</div>
            </div>
            <div>
              <div className="text-slate-400">Start date</div>
              <div className="font-medium">{data.startDateLabel}</div>
            </div>
            <div>
              <div className="text-slate-400">Status</div>
              <div className="font-medium">ACTIVE</div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            No active tenancy found. If this is wrong, contact support.
          </p>
        )}

        {data.activeTenancy && (
          <div>
            <Link
              href="/tenant/report-issue"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 active:bg-indigo-700"
            >
              Report an issue
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-4">
        <h2 className="font-medium">Your Issues</h2>

        {data.issues.length === 0 ? (
          <p className="text-sm text-slate-400">No issues raised yet.</p>
        ) : (
          <div className="space-y-3">
           {data.issues.map((i) => (
  <Link
    key={i.id}
    href={`/tenant/issues/${i.id}`}
    className="block rounded-lg border border-slate-800 bg-slate-950 p-3 hover:bg-slate-900"
  >
    <div className="font-medium">{i.title}</div>
    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
      <span className="rounded-full bg-slate-800 px-2 py-0.5">
        {i.status}
      </span>
      <span>•</span>
      <span>{i.createdAtLabel}</span>
    </div>
  </Link>
))}

          </div>
        )}
      </section>

      <section className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium">Viewing report</h2>
          <div className="flex items-center gap-3">
            <Link
              href="/tenant/viewing-reports"
              className="text-sm text-indigo-300 hover:text-indigo-200"
            >
              View all
            </Link>
            <Link
              href="/tenant/viewing-reports"
              className="text-sm text-indigo-300 hover:text-indigo-200"
            >
              Activity log
            </Link>
          </div>
        </div>

        {viewingReports.length === 0 ? (
          <p className="text-sm text-slate-400">
            No viewing report available yet.
          </p>
        ) : (
          <div className="space-y-2">
            {viewingReports.map((r) => (
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
