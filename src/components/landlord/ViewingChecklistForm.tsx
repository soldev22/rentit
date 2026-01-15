"use client";

import { useMemo, useState } from "react";

type ViewingChecklistItem = {
  key: string;
  label: string;
  checked: boolean;
  comment?: string;
};

type ApplicantResponse = {
  status: "confirmed" | "declined";
  respondedAt: string;
  comment?: string;
};

type ViewingSummary = {
  notes?: string;
  checklist?: ViewingChecklistItem[];
  photos?: Array<{
    url: string;
    uploadedAt: string;
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
  }>;
  savedAt?: string;
  completedAt?: string;
  sentToApplicantAt?: string;
  confirmationTokenExpiresAt?: string;
  confirmationTokenUsedAt?: string;
  applicantResponse?: ApplicantResponse;
} | null;

type Props = {
  appId: string;
  applicantName: string;
  applicantEmail: string;
  initialSummary: ViewingSummary;
};

const DEFAULT_ITEMS: ViewingChecklistItem[] = [
  { key: "keys-locks", label: "Keys/locks/entry working", checked: false },
  { key: "heating-test", label: "Heating quick-tested", checked: false },
  { key: "hot-water", label: "Hot water quick-tested", checked: false },
  { key: "lights", label: "Lights working in main areas", checked: false },
  { key: "smoke-alarms", label: "Smoke alarms present / working", checked: false },
  { key: "co-alarm", label: "CO alarm present (if applicable)", checked: false },
  { key: "hazards", label: "No obvious safety hazards spotted", checked: false },
  { key: "damp", label: "Any damp/mould/condensation signs noted", checked: false },
  { key: "windows-doors", label: "Windows/doors condition checked", checked: false },
  { key: "appliances", label: "Appliances/fixtures condition checked", checked: false },
  { key: "meters", label: "Meters/stopcock location noted (if known)", checked: false },
  { key: "bins-parking", label: "Bins/parking/local info covered", checked: false },
  { key: "signal", label: "Mobile signal / internet notes captured (optional)", checked: false },
  { key: "disclosures", label: "Known issues / planned works disclosed", checked: false },
  { key: "repairs-promised", label: "Any repairs promised recorded", checked: false },
  { key: "photos", label: "Photos taken (optional)", checked: false },
  { key: "rules", label: "Viewing rules explained (photos/personal items)", checked: false },
  { key: "questions", label: "Viewer questions answered", checked: false },
  { key: "next-steps", label: "Next steps explained (confirmation link)", checked: false },
];

function formatWhen(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function ViewingChecklistForm({
  appId,
  applicantName,
  applicantEmail,
  initialSummary,
}: Props) {
  const seededItems = useMemo(() => {
    const existing = initialSummary?.checklist;
    if (Array.isArray(existing) && existing.length > 0) return existing;
    return DEFAULT_ITEMS;
  }, [initialSummary]);

  const [notes, setNotes] = useState(initialSummary?.notes ?? "");
  const [items, setItems] = useState<ViewingChecklistItem[]>(seededItems);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState<ViewingSummary>(initialSummary);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const sentAt = summary?.sentToApplicantAt;
  const applicantResponse = summary?.applicantResponse;
  const photos = summary?.photos ?? [];

  async function refreshSummary() {
    const res = await fetch(`/api/tenancy-applications/${appId}`);
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    const app = data?.application ?? data;
    if (app?.stage1?.viewingSummary) setSummary(app.stage1.viewingSummary);
  }

  async function uploadPhotos(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    setMessage(null);
    setMessageType(null);

    setUploadingPhotos(true);
    try {
      const formData = new FormData();
      for (const f of Array.from(fileList)) formData.append("files", f);

      const res = await fetch(`/api/tenancy-applications/${appId}/viewing-checklist/photos`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessageType("error");
        setMessage(data?.error || "Failed to upload photos");
        return;
      }

      setMessageType("success");
      setMessage("Photo(s) uploaded.");
      await refreshSummary();
    } catch {
      setMessageType("error");
      setMessage("Failed to upload photos");
    } finally {
      setUploadingPhotos(false);
    }
  }

  function cleanItems(next: ViewingChecklistItem[]) {
    const trimmed = next
      .map((i) => ({
        key: String(i.key || "").slice(0, 40),
        label: String(i.label || "").slice(0, 120),
        checked: Boolean(i.checked),
        comment: i.comment ? String(i.comment).slice(0, 300) : undefined,
      }))
      .filter((i) => i.key && i.label);

    const unique = new Map<string, ViewingChecklistItem>();
    for (const item of trimmed) {
      if (!unique.has(item.key)) unique.set(item.key, item);
    }
    return Array.from(unique.values()).slice(0, 25);
  }

  async function saveDraft() {
    setMessage(null);
    setMessageType(null);

    setSaving(true);
    try {
      const res = await fetch(`/api/tenancy-applications/${appId}/viewing-checklist`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, checklist: cleanItems(items) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessageType("error");
        setMessage(data?.error || "Failed to save checklist");
        return;
      }

      setMessageType("success");
      setMessage("Saved.");
      await refreshSummary();
    } catch {
      setMessageType("error");
      setMessage("Failed to save checklist");
    } finally {
      setSaving(false);
    }
  }

  async function sendToApplicant() {
    setMessage(null);
    setMessageType(null);

    setSending(true);
    try {
      const res = await fetch(
        `/api/tenancy-applications/${appId}/viewing-checklist/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes, checklist: cleanItems(items) }),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessageType("error");
        setMessage(data?.error || "Failed to send to applicant");
        return;
      }

      setMessageType("success");
      setMessage(`Sent to ${applicantName} for confirmation.`);
      await refreshSummary();
    } catch {
      setMessageType("error");
      setMessage("Failed to send to applicant");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div
          className={`rounded-md p-3 text-sm ${
            messageType === "error"
              ? "bg-red-50 text-red-800"
              : "bg-green-50 text-green-800"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-slate-900">Notes</h2>
          <p className="text-sm text-slate-600">
            Capture key points from the viewing (no tenancy/financial details).
          </p>
        </div>
        <textarea
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          rows={10}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={
            "Suggested structure:\n" +
            "- What they liked:\n" +
            "- Any concerns raised:\n" +
            "- Issues spotted / disclosed:\n" +
            "- Repairs promised (if any):\n" +
            "- Access/parking/bin notes:\n" +
            "- Follow-up tasks:\n"
          }
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-slate-900">Photos</h2>
          <p className="text-sm text-slate-600">
            Optional photos to record condition/issues (avoid personal items if the property is currently occupied).
          </p>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={uploadingPhotos}
            onChange={(e) => {
              void uploadPhotos(e.target.files);
              // reset input so user can re-upload same file after changes
              e.currentTarget.value = "";
            }}
            placeholder="Upload photos (JPG, PNG, WEBP)"
          />
          <div className="text-xs text-slate-500">
            JPG/PNG/WEBP up to 5MB each.
          </div>
        </div>

        {photos.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p) => (
              <a
                key={p.url}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-md border border-slate-200 bg-slate-50"
                title="Open image"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt="Viewing photo"
                  className="h-28 w-full object-cover transition-transform group-hover:scale-[1.02]"
                />
              </a>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-600">No photos uploaded yet.</div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold text-slate-900">Checklist</h2>
        <p className="mt-1 text-sm text-slate-600">Quick tap checklist for on-site completion.</p>

        <div className="mt-4 space-y-3">
          {items.map((item, idx) => (
            <div key={item.key} className="rounded-md border border-slate-200 p-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={item.checked}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setItems((prev) =>
                      prev.map((p, i) => (i === idx ? { ...p, checked } : p))
                    );
                  }}
                />
                <span className="text-sm font-medium text-slate-900">{item.label}</span>
              </label>
              <input
                type="text"
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={item.comment ?? ""}
                onChange={(e) => {
                  const comment = e.target.value;
                  setItems((prev) =>
                    prev.map((p, i) => (i === idx ? { ...p, comment } : p))
                  );
                }}
                placeholder="Optional comment"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold text-slate-900">Applicant confirmation</h2>
        <p className="mt-1 text-sm text-slate-600">
          When you send this, {applicantName} ({applicantEmail}) will receive a magic link to
          confirm they’re happy with the property.
        </p>

        <div className="mt-3 space-y-1 text-sm text-slate-700">
          {sentAt ? (
            <div>
              <span className="font-medium">Sent:</span> {formatWhen(sentAt)}
            </div>
          ) : (
            <div>
              <span className="font-medium">Sent:</span> Not sent yet
            </div>
          )}
          {applicantResponse ? (
            <div>
              <span className="font-medium">Applicant response:</span> {" "}
              {applicantResponse.status === "confirmed" ? "Confirmed" : "Not proceeding"} ·{" "}
              {formatWhen(applicantResponse.respondedAt)}
              {applicantResponse.comment ? (
                <div className="mt-1 rounded-md bg-slate-50 p-2 text-slate-800">
                  <span className="font-medium">Comment:</span> {applicantResponse.comment}
                </div>
              ) : null}
            </div>
          ) : sentAt ? (
            <div>
              <span className="font-medium">Applicant response:</span> Awaiting confirmation
            </div>
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white p-4 sm:mx-0 sm:rounded-lg sm:border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            Tip: Save draft while on-site. Send when ready.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveDraft}
              disabled={saving}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              onClick={sendToApplicant}
              disabled={sending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send to applicant"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
