"use client";

import { useState } from "react";

type Props = {
  token: string;
};

export default function ViewingConfirmForm({ token }: Props) {
  const [decision, setDecision] = useState<"confirmed" | "declined" | "query" | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(nextDecision: "confirmed" | "declined" | "query") {
    setError(null);

    if (nextDecision === 'query' && comment.trim().length === 0) {
      setError('Please enter your query/question before sending');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/viewing/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, decision: nextDecision, comment: comment.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Failed to submit confirmation");
        return;
      }
      setDecision(nextDecision);
      setDone(true);
    } catch {
      setError("Failed to submit confirmation");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
        {decision === "confirmed"
          ? "Thanks — we’ve recorded your consent to proceed."
          : decision === "declined"
            ? "Thanks — we’ve recorded that you’re not proceeding."
            : "Thanks — we’ve sent your query to the landlord. You can return to this link later (until it expires) to accept or reject."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div>
        <label className="block text-sm font-medium text-slate-800">Comment</label>
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add any comments. Required if you choose Query."
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => submit("confirmed")}
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "I’m happy with this property — proceed"}
        </button>
        <button
          type="button"
          onClick={() => submit("declined")}
          disabled={submitting}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "I’m not proceeding"}
        </button>

        <button
          type="button"
          onClick={() => submit("query")}
          disabled={submitting}
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "I have a query"}
        </button>
      </div>

      <p className="text-xs text-slate-500">
        This confirms only whether you’re happy with the property.
      </p>
    </div>
  );
}
