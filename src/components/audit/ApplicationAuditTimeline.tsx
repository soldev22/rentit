"use client";

import { useEffect, useMemo, useState } from "react";

type AuditEventItem = {
  _id: string;
  createdAt: string | null;
  activity?: string;
  description?: string;
  action?: string;
  success?: boolean;
};

function formatWhen(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-GB");
}

export default function ApplicationAuditTimeline({
  appId,
  variant = "light",
  className,
  limit = 50,
}: {
  appId: string;
  variant?: "light" | "dark";
  className?: string;
  limit?: number;
}) {
  const [items, setItems] = useState<AuditEventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(() => {
    if (variant === "dark") {
      return {
        container: "rounded-xl border border-slate-800 bg-slate-950 p-4",
        title: "text-sm font-semibold text-white",
        meta: "text-xs text-slate-500",
        row: "rounded-md border border-slate-800 bg-slate-900 p-3",
        activity: "text-sm text-slate-100",
        empty: "text-sm text-slate-400",
        error: "text-sm text-red-300",
      };
    }

    return {
      container: "rounded-xl border border-gray-200 bg-white p-4",
      title: "text-sm font-semibold text-gray-900",
      meta: "text-xs text-gray-500",
      row: "rounded-md border border-gray-200 bg-gray-50 p-3",
      activity: "text-sm text-gray-900",
      empty: "text-sm text-gray-600",
      error: "text-sm text-red-700",
    };
  }, [variant]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setItems(null);

      try {
        const res = await fetch(`/api/tenancy-applications/${encodeURIComponent(appId)}/audit?limit=${limit}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || `Failed to load audit (${res.status})`);
        }

        const data = (await res.json()) as AuditEventItem[];
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load audit");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [appId, limit]);

  return (
    <section className={[styles.container, className].filter(Boolean).join(" ")}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className={styles.title}>Activity</h2>
        <div className={styles.meta}>Newest first</div>
      </div>

      {error ? <div className={["mt-3", styles.error].join(" ")}>{error}</div> : null}

      {items === null && !error ? (
        <div className={["mt-3", styles.empty].join(" ")}>Loading…</div>
      ) : null}

      {items?.length === 0 ? (
        <div className={["mt-3", styles.empty].join(" ")}>No activity recorded yet.</div>
      ) : null}

      {items && items.length > 0 ? (
        <div className="mt-3 space-y-2">
          {items.map((e) => (
            <div key={e._id} className={styles.row}>
              <div className={styles.activity}>{e.activity || e.description || e.action || "Activity"}</div>
              <div className={styles.meta}>{formatWhen(e.createdAt)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
