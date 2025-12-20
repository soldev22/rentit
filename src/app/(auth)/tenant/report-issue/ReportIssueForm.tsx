"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";


type PropertyOption = { id: string; label: string };

export default function ReportIssueForm({ properties }: { properties: PropertyOption[] }) {
  const router = useRouter();

  const defaultPropertyId = useMemo(() => {
    return properties.length === 1 ? properties[0].id : "";
  }, [properties]);

  const [propertyId, setPropertyId] = useState(defaultPropertyId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "EMERGENCY">("MEDIUM");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!propertyId || !title.trim() || !description.trim() || !priority) {
      setError("Please complete all fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, title, description, priority }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Something went wrong.");
        return;
      }

      setOk(true);
      setTitle("");
      setDescription("");
      // keep propertyId so they can raise another quickly if needed
    } catch (err: any) {
      setError(err?.message || "Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-[920px] mx-auto p-5 pb-16">
      <header className="mb-4">
        <h1 className="text-[28px] m-0">Report an Issue</h1>
        <p className="mt-1 text-white/70">Tell us what’s wrong and we’ll log it properly.</p>
      </header>

      <form className="bg-white/5 border border-white/10 rounded-[14px] p-4 flex flex-col gap-3.5" onSubmit={onSubmit}>
        {properties.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/65">Property</label>
            <select
              className="bg-black/25 border border-white/15 rounded-[12px] p-2 text-white outline-none"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
            >
              <option value="">Select a property…</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {properties.length === 1 && (
          <div className="flex flex-col gap-1.5">
            <div className="text-xs text-white/65">Property</div>
            <div className="p-2 rounded-[12px] bg-black/20 border border-white/10 text-white/95">{properties[0].label}</div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-white/65">Title</label>
          <input
            className="bg-black/25 border border-white/15 rounded-[12px] p-2 text-white outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Boiler not heating"
            maxLength={80}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-white/65">Description</label>
          <textarea
            className="bg-black/25 border border-white/15 rounded-[12px] p-2 text-white outline-none resize-vertical"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happened? When did it start? Any photos? (Photos later.)"
            rows={6}
            maxLength={2000}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="text-xs text-white/65">Priority</div>
          <div className="grid grid-cols-2 gap-2.5">
            {(["LOW", "MEDIUM", "HIGH", "EMERGENCY"] as const).map((p) => (
              <label key={p} className="flex gap-2.5 items-center p-2 rounded-[12px] bg-black/20 border border-white/10">
                <input
                  type="radio"
                  name="priority"
                  value={p}
                  checked={priority === p}
                  onChange={() => setPriority(p)}
                />
                <span>{p}</span>
              </label>
            ))}
          </div>
        </div>

        {error && <div className="p-2 rounded-[12px] bg-red-500/10 border border-red-500/30">{error}</div>}
        {ok && (
          <div className="p-2 rounded-[12px] bg-green-600/10 border border-green-600/30 flex justify-between gap-3 items-center">
            Submitted. We’ve logged your issue.
            <button
              type="button"
              className="bg-transparent border-none text-white underline cursor-pointer p-0"
              onClick={() => router.push("/tenant/dashboard")}
            >
              Back to dashboard
            </button>
          </div>
        )}

        <button className="w-full p-3.5 rounded-[12px] bg-blue-600 text-white font-bold border-none cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed" disabled={submitting} type="submit">
          {submitting ? "Submitting…" : "Submit issue"}
        </button>
      </form>
    </main>
  );
}
