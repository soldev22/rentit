// src/app/tenant/dashboard/page.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getTenantDashboardData } from "../../../../lib/tenant/dashboard";

export default async function TenantDashboardPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session!.user!.id!;

  const data = await getTenantDashboardData(tenantId);

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
    </main>
  );
}
