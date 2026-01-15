"use client";

import { useMemo, useState } from "react";

type Recipient = {
  label: string;
  email?: string;
  tel?: string;
};

type AiContext = {
  decision: "pass" | "fail";
  letterDate?: string;
  applicantName: string;
  coTenantName?: string;
  applicantAddress?: string;
  landlordName?: string;
  landlordEmail?: string;
  landlordPhone?: string;
  landlordAddress?: string;
  propertyTitle: string;
  propertyAddress: string;
  rentPcm?: number;
  deposit?: number;
  tenancyLengthMonths?: number;
  availabilityDate?: string;
  moveInDate?: string;
  landlordNotes?: string;
  dashboardLink: string;
};

type Props = {
  applicationId: string;
  decision: "pass" | "fail";
  propertyTitle: string;
  propertyAddressLine: string;
  recipients: Recipient[];
  initialSubject: string;
  initialMessage: string;
  initialSmsMessage: string;
  alreadyNotifiedAt?: string;
  aiContext: AiContext;
};

type NotifyDecisionResponse = {
  ok: boolean;
  decision: "pass" | "fail";
  notifiedAt?: string;
  results?: {
    primary?: { email?: boolean; sms?: boolean };
    coTenant?: { email?: boolean; sms?: boolean };
  };
};

type GenerateLetterResponse = {
  subject: string;
  message: string;
  smsMessage?: string;
};

function hasError(data: unknown): data is { error: string } {
  return (
    !!data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error?: unknown }).error === "string"
  );
}

export default function DecisionLetterReview(props: Props) {
  const [subject, setSubject] = useState(props.initialSubject);
  const [message, setMessage] = useState(props.initialMessage);
  const [smsMessage, setSmsMessage] = useState(props.initialSmsMessage);
  const [sendSms, setSendSms] = useState(true);

  const [confirmedReady, setConfirmedReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<NotifyDecisionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const hasAnyPhone = useMemo(() => props.recipients.some((r) => Boolean(r.tel)), [props.recipients]);

  const decisionLabel = props.decision === "pass" ? "SUCCESSFUL" : "CAN'T PROCEED";
  const decisionTone =
    props.decision === "pass" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200";

  async function generateWithAi() {
    setError(null);
    setResult(null);

    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-decision-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...props.aiContext,
          currentSubject: subject,
          currentMessage: message,
        }),
      });

      const data = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        setError(hasError(data) ? data.error : "AI service unavailable");
        return;
      }

      if (!data || typeof data !== "object") {
        setError("AI returned an invalid response");
        return;
      }

      const maybe = data as Partial<GenerateLetterResponse>;
      if (typeof maybe.subject !== "string" || typeof maybe.message !== "string") {
        setError("AI returned an invalid response");
        return;
      }

      setSubject(maybe.subject);
      setMessage(maybe.message);
      if (typeof maybe.smsMessage === "string") {
        setSmsMessage(maybe.smsMessage);
      }
    } catch {
      setError("AI service unavailable");
    } finally {
      setGenerating(false);
    }
  }

  async function send() {
    setError(null);
    setResult(null);

    if (!confirmedReady) {
      setError("Tick the checkbox to confirm the letter is good to go.");
      return;
    }
    if (!subject.trim() || !message.trim()) {
      setError("Subject and message are required.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/tenancy-applications/${props.applicationId}/notify-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          smsMessage: smsMessage.trim() || undefined,
          sendSms: Boolean(sendSms && hasAnyPhone),
        }),
      });

      const data = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        setError(hasError(data) ? data.error : "Failed to send");
        return;
      }

      setResult(data as NotifyDecisionResponse);
    } catch {
      setError("Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-lg border p-4 ${decisionTone}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Decision letter</div>
            <div className="text-xs text-slate-700">
              Property: <span className="font-semibold">{props.propertyTitle}</span>
            </div>
            <div className="mt-1 text-xs text-slate-700">{props.propertyAddressLine}</div>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
              props.decision === "pass" ? "bg-green-600 text-white" : "bg-red-600 text-white"
            }`}
          >
            {decisionLabel}
          </span>
        </div>

        {props.alreadyNotifiedAt ? (
          <div className="mt-2 text-xs text-slate-700">
            Last sent: <span className="font-semibold">{new Date(props.alreadyNotifiedAt).toLocaleString()}</span>
          </div>
        ) : null}
      </div>

      {error ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}
      {result?.ok ? (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          Sent. (Primary email: {String(result?.results?.primary?.email)}; Primary sms: {String(result?.results?.primary?.sms)}; Co-tenant email: {String(result?.results?.coTenant?.email)}; Co-tenant sms: {String(result?.results?.coTenant?.sms)})
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="text-sm font-semibold text-slate-900">Recipients</div>
        <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-slate-800">
          {props.recipients.map((r) => (
            <div key={r.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="font-semibold">{r.label}</div>
              <div className="text-xs text-slate-700">Email: {r.email || "—"}</div>
              <div className="text-xs text-slate-700">SMS: {r.tel || "—"}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="text-sm font-semibold text-slate-900">Email</div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Tip: keep the applicant/property addresses and tenancy details in the body.
          </div>
          <button
            type="button"
            onClick={generateWithAi}
            disabled={generating}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            {generating ? "Generating…" : "Generate with AI"}
          </button>
        </div>

        <label htmlFor="decision-letter-subject" className="mt-3 block text-xs font-medium text-slate-700">
          Subject
        </label>
        <input
          id="decision-letter-subject"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        <label htmlFor="decision-letter-message" className="mt-4 block text-xs font-medium text-slate-700">
          Message
        </label>
        <textarea
          id="decision-letter-message"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          rows={14}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">Preview</summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
            {message}
          </pre>
        </details>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">SMS (optional)</div>
            <div className="mt-1 text-xs text-slate-600">
              SMS uses a shorter message. Disable if you only want email.
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={sendSms && hasAnyPhone}
              disabled={!hasAnyPhone}
              onChange={(e) => setSendSms(e.target.checked)}
            />
            Send SMS
          </label>
        </div>

        <label htmlFor="decision-letter-sms" className="mt-3 block text-xs font-medium text-slate-700">
          SMS message
        </label>
        <textarea
          id="decision-letter-sms"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          rows={3}
          value={smsMessage}
          onChange={(e) => setSmsMessage(e.target.value)}
          disabled={!hasAnyPhone || !sendSms}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <label className="flex items-start gap-3 text-sm text-slate-800">
          <input
            type="checkbox"
            className="mt-1"
            checked={confirmedReady}
            onChange={(e) => setConfirmedReady(e.target.checked)}
          />
          <span>I confirm this letter is good to go and ready to send.</span>
        </label>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={send}
            disabled={sending || !confirmedReady}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {sending ? "Sending…" : props.alreadyNotifiedAt ? "Re-send decision" : "Send decision"}
          </button>
          <span className="text-xs text-slate-500">Uses email (and optional SMS) to notify both parties.</span>
        </div>
      </div>
    </div>
  );
}
