import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { formatPropertyLabel } from "@/lib/formatPropertyLabel";

export const dynamic = "force-dynamic";

function formatWhen(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB");
}

export default async function TenantViewingReportDetailPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "TENANT") redirect("/dashboard");
  if (!session.user.id) redirect("/dashboard");

  const { appId } = await params;
  if (!ObjectId.isValid(appId)) notFound();

  const applications = await getCollection("tenancy_applications");
  const application = await applications.findOne({ _id: new ObjectId(appId) });
  if (!application) notFound();

  const applicantId = (application as any)?.applicantId;
  if (!applicantId || String(applicantId) !== String(session.user.id)) {
    // Don’t leak existence of other applications.
    notFound();
  }

  const summary = (application as any)?.stage1?.viewingSummary;
  const checklist = Array.isArray(summary?.checklist) ? summary.checklist : [];
  const notes = typeof summary?.notes === "string" ? summary.notes : "";
  const photos = Array.isArray(summary?.photos) ? summary.photos : [];
  const photosForItem = (itemKey: string) =>
    photos.filter((p: any) => String(p?.itemKey || "") === String(itemKey));
  const unassignedPhotos = photos.filter((p: any) => !p?.itemKey);

  const propertyId = String((application as any)?.propertyId || "");
  const properties = await getCollection("properties");
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

  const propertyLabel = formatPropertyLabel({ title, address });
  const savedAt = typeof summary?.savedAt === "string" ? summary.savedAt : undefined;
  const sentAt = typeof summary?.sentToApplicantAt === "string" ? summary.sentToApplicantAt : undefined;
  const applicantResponse = summary?.applicantResponse as
    | { status?: "confirmed" | "declined"; respondedAt?: string; comment?: string }
    | undefined;

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Viewing report</h1>
        <p className="text-sm text-slate-400">{propertyLabel}</p>
        <div className="text-xs text-slate-500">
          {savedAt ? <span>Saved: {formatWhen(savedAt)}</span> : null}
          {sentAt ? <span>{savedAt ? " · " : null}Sent: {formatWhen(sentAt)}</span> : null}
        </div>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-4">
        {notes ? (
          <div>
            <h2 className="text-sm font-semibold text-white">Notes</h2>
            <div className="mt-2 whitespace-pre-wrap rounded-md bg-slate-900 p-3 text-sm text-slate-100">
              {notes}
            </div>
          </div>
        ) : null}

        {checklist.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold text-white">Checklist</h2>
            <div className="mt-2 space-y-2">
              {checklist.map((item: any) => (
                <div key={String(item.key)} className="rounded-md border border-slate-800 bg-slate-900 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-medium text-slate-100">{String(item.label)}</div>
                    <div
                      className={
                        item.checked
                          ? "rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-semibold text-green-200"
                          : "rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-200"
                      }
                    >
                      {item.checked ? "Yes" : "No"}
                    </div>
                  </div>
                  {item.comment ? (
                    <div className="mt-1 text-sm text-slate-300">{String(item.comment)}</div>
                  ) : null}

                  {photosForItem(String(item.key)).length > 0 ? (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {photosForItem(String(item.key)).slice(0, 6).map((p: any) => (
                        <a
                          key={String(p.url)}
                          href={String(p.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="group overflow-hidden rounded-md border border-slate-800 bg-slate-950"
                          title="Open image"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={String(p.url)}
                            alt="Checklist photo"
                            className="h-24 w-full object-cover transition-transform group-hover:scale-[1.02]"
                          />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {unassignedPhotos.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold text-white">Other photos</h2>
            <p className="mt-1 text-sm text-slate-400">Photos not tied to a specific checklist item.</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {unassignedPhotos.map((p: any) => (
                <a
                  key={String(p.url)}
                  href={String(p.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-md border border-slate-800 bg-slate-950"
                  title="Open image"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={String(p.url)}
                    alt="Viewing photo"
                    className="h-28 w-full object-cover transition-transform group-hover:scale-[1.02]"
                  />
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {applicantResponse?.respondedAt ? (
          <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
            <div className="text-sm text-slate-200">
              <span className="font-semibold">Your response:</span> {applicantResponse.status === "declined" ? "Not proceeding" : "Confirmed"} · {formatWhen(applicantResponse.respondedAt)}
            </div>
            {applicantResponse.comment ? (
              <div className="mt-1 text-sm text-slate-300">{applicantResponse.comment}</div>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="flex items-center justify-between">
        <Link href="/tenant/viewing-reports" className="text-sm text-indigo-300 hover:text-indigo-200">
          ← Back to reports
        </Link>
        <Link href="/tenant/dashboard" className="text-sm text-indigo-300 hover:text-indigo-200">
          Tenant dashboard
        </Link>
      </div>
    </main>
  );
}
