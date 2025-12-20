"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type IssueHistoryItem = {
  text: string;
  createdAt: string;
  createdBy: string;
  role: string;
};

type Issue = {
  id: string;
  title: string;
  description: string;
  status: string;
  descriptionHistory?: IssueHistoryItem[];
};


export default function TenantIssueEditor({ issue }: { issue: Issue }) {
  const router = useRouter();

  const [title, setTitle] = useState(issue.title);
  const [updateText, setUpdateText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/maintenance/${issue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          updateText,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update issue");
      }

      setUpdateText("");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-4">
      <div>
        <div className="text-xs text-slate-400">Status</div>
        <div className="inline-block mt-1 rounded-full bg-slate-800 px-3 py-1 text-sm">
          {issue.status}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-slate-400">Title</label>
        <input
          className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-slate-400">Original description</label>
        <textarea
          className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-sm"
          rows={4}
          value={issue.description}
          readOnly
        />
      </div>
{issue.descriptionHistory && issue.descriptionHistory.length > 0 && (
  <div className="space-y-3">
    <div className="text-xs uppercase tracking-wide text-slate-400">
      Update history
    </div>

    <ul className="space-y-3">
      {issue.descriptionHistory.map((item, index) => (
        <li
          key={index}
          className="rounded-lg border border-slate-800 bg-slate-950 p-3"
        >
          <div className="mb-1 text-xs text-slate-400">
            {item.role} ·{" "}
            {new Date(item.createdAt).toLocaleString()}
          </div>

          <div className="whitespace-pre-wrap text-sm text-slate-200">
            {item.text}
          </div>
        </li>
      ))}
    </ul>
  </div>
)}

      <div className="space-y-2">
        <label className="text-xs text-slate-400">Add update</label>
        <textarea
          className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-sm resize-y"
          rows={4}
          value={updateText}
          onChange={(e) => setUpdateText(e.target.value)}
          placeholder="Add an update…"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={onSave}
        disabled={saving}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </section>
  );
}
