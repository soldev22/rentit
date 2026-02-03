"use client";

import { useState } from "react";

type DeliveryResult = {
  email: { attempted: boolean; ok: boolean; reason?: string };
  sms: { attempted: boolean; ok: boolean; reason?: string };
};

export default function ProceedLetterEditor(props: {
  appId: string;
  applicantEmail: string;
  applicantTel?: string | null;
  seedSubject: string;
  seedContent: string;
  existing?: {
    subject?: string;
    content?: string;
    savedAt?: string;
    sentAt?: string;
  };
  canSend: boolean;
}) {
  const [subject, setSubject] = useState(props.existing?.subject || props.seedSubject);
  const [content, setContent] = useState(props.existing?.content || props.seedContent);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<DeliveryResult | null>(null);

  const sentAt = props.existing?.sentAt;
  const isSent = Boolean(sentAt);

  async function saveDraft() {
    setMessage(null);
    setDelivery(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/tenancy-applications/${encodeURIComponent(props.appId)}/proceed-letter`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), content }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(data?.error || `Failed to save (status ${res.status})`);
        return;
      }
      setMessage("Draft saved.");
    } catch {
      setMessage("Failed to save draft.");
    } finally {
      setSaving(false);
    }
  }

  async function sendLetter() {
    if (!props.canSend) {
      setMessage("Consent to proceed is required before sending.");
      return;
    }
    if (!confirm("Send this letter to the applicant by email?")) return;

    setMessage(null);
    setDelivery(null);
    setSending(true);
    try {
      const res = await fetch(`/api/tenancy-applications/${encodeURIComponent(props.appId)}/proceed-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), content }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(data?.error || `Failed to send (status ${res.status})`);
        return;
      }
      setDelivery(data?.delivery || null);
      setMessage("Letter sent.");
      // hard refresh to reflect sentAt from server-rendered page on next navigation
    } catch {
      setMessage("Failed to send letter.");
    } finally {
      setSending(false);
    }
  }

  function printLetter() {
    window.print();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 print:hidden">
        <h2 className="text-base font-semibold text-slate-900">Tenancy proceed letter</h2>
        <p className="mt-1 text-sm text-slate-600">
          This letter is sent after the applicant gives consent to proceed. It is editable before sending.
        </p>

        <div className="mt-3 grid gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-800">Email subject</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              disabled={isSent}
              placeholder="Enter email subject"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800">Letter text</label>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={16}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSent}
              placeholder="Enter letter text"
            />
          </div>
        </div>

        {message ? <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-800">{message}</div> : null}

        {delivery ? (
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
            <div className="font-semibold">Delivery</div>
            <div className="mt-1">Email: {delivery.email.ok ? "sent" : "failed"}{delivery.email.reason ? ` (${delivery.email.reason})` : ""}</div>
            <div className="mt-1">SMS: {delivery.sms.attempted ? (delivery.sms.ok ? "sent" : "failed") : "not attempted"}{delivery.sms.reason ? ` (${delivery.sms.reason})` : ""}</div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setSubject(props.seedSubject);
              setContent(props.seedContent);
              setMessage("Reset to template.");
            }}
            disabled={isSent || saving || sending}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            Reset to template
          </button>

          <button
            type="button"
            onClick={saveDraft}
            disabled={isSent || saving || sending}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>

          <button
            type="button"
            onClick={sendLetter}
            disabled={isSent || sending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            title={!props.canSend ? "Requires applicant consent to proceed" : undefined}
          >
            {isSent ? "Sent" : sending ? "Sending…" : "Send letter"}
          </button>

          <button
            type="button"
            onClick={printLetter}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Print
          </button>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Applicant: {props.applicantEmail}
          {props.applicantTel ? ` · ${props.applicantTel}` : ""}
          {isSent ? ` · Sent at: ${sentAt}` : ""}
        </div>
      </div>

      {/* Print-only copy of the letter */}
      <div className="hidden print:block">
        <div className="whitespace-pre-wrap text-sm text-slate-900">{content}</div>
      </div>
    </div>
  );
}
