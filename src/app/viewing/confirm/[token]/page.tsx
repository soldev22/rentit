import { ObjectId } from "mongodb";
import { notFound } from "next/navigation";
import Link from "next/link";

import { getCollection } from "@/lib/db";
import { formatPropertyLabel } from "@/lib/formatPropertyLabel";
import ViewingConfirmForm from "@/components/viewing/ViewingConfirmForm";

export const dynamic = "force-dynamic";


export default async function ViewingConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // We find the application by hashing token in the API route; for page load we do the same with node crypto.
  const crypto = await import("crypto");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const applications = await getCollection("tenancy_applications");
  const application = await applications.findOne({
    "stage1.viewingSummary.confirmationTokenHash": tokenHash,
  });

  if (!application) notFound();

  const summary = (application as any)?.stage1?.viewingSummary;
  const expiresAt = summary?.confirmationTokenExpiresAt ? new Date(summary.confirmationTokenExpiresAt) : null;
  const usedAt = summary?.confirmationTokenUsedAt ? new Date(summary.confirmationTokenUsedAt) : null;

  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return (
      <div className="mx-auto w-full max-w-xl p-6">
        <h1 className="text-xl font-bold text-slate-900">Link expired</h1>
        <p className="mt-2 text-sm text-slate-700">This confirmation link is invalid or has expired.</p>
      </div>
    );
  }

  if (usedAt && !Number.isNaN(usedAt.getTime())) {
    return (
      <div className="mx-auto w-full max-w-xl p-6">
        <h1 className="text-xl font-bold text-slate-900">Already confirmed</h1>
        <p className="mt-2 text-sm text-slate-700">This confirmation link has already been used.</p>
      </div>
    );
  }

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

  const checklist = Array.isArray(summary?.checklist) ? summary.checklist : [];
  const notes = typeof summary?.notes === "string" ? summary.notes : "";
  const photos = Array.isArray(summary?.photos) ? summary.photos : [];
  const photosForItem = (itemKey: string) =>
    photos.filter((p: any) => String(p?.itemKey || "") === String(itemKey));
  const unassignedPhotos = photos.filter((p: any) => !p?.itemKey);

  return (
    <div className="mx-auto w-full max-w-xl p-4 sm:p-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h1 className="text-xl font-bold text-slate-900">Confirm the property</h1>
        <p className="mt-2 text-sm text-slate-700">
          Please review the viewing summary and confirm whether you’re happy with <span className="font-medium">{propertyLabel}</span>.
        </p>

        {notes ? (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-slate-900">Notes</h2>
            <div className="mt-1 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-800">
              {notes}
            </div>
          </div>
        ) : null}

        {checklist.length > 0 ? (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-slate-900">Checklist</h2>
            <div className="mt-2 space-y-2">
              {checklist.map((item: any) => (
                <div key={String(item.key)} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-medium text-slate-900">{String(item.label)}</div>
                    <div
                      className={
                        item.checked
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800"
                          : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
                      }
                    >
                      {item.checked ? "Yes" : "No"}
                    </div>
                  </div>
                  {item.comment ? (
                    <div className="mt-1 text-sm text-slate-700">{String(item.comment)}</div>
                  ) : null}

                  {photosForItem(String(item.key)).length > 0 ? (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {photosForItem(String(item.key)).slice(0, 4).map((p: any) => (
                        <a
                          key={String(p.url)}
                          href={String(p.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="group overflow-hidden rounded-md border border-slate-200 bg-slate-50"
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
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-slate-900">Other photos</h2>
            <p className="mt-1 text-sm text-slate-600">Photos not tied to a specific checklist item.</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {unassignedPhotos.map((p: any) => (
                <a
                  key={String(p.url)}
                  href={String(p.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-md border border-slate-200 bg-slate-50"
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

        <div className="mt-6">
          <ViewingConfirmForm token={token} />
        </div>

        <div className="mt-6 flex justify-end">
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
