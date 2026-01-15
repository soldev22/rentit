"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Thread = {
  _id: string;
  subject?: string;
  kind: "adhoc" | "legal" | "maintenance";
  lastMessageAt: string;
  participants: Array<{ userId: string; role?: string; email?: string; phone?: string }>;
};

export default function MessagesHomeClient() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/messages/threads");
        if (!res.ok) throw new Error("Failed to load messages");
        const data = await res.json();
        const nextThreads = Array.isArray(data?.threads) ? data.threads : [];
        setThreads(nextThreads);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load messages");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return threads;
    return threads.filter((t) => {
      const subject = (t.subject ?? "").toLowerCase();
      const participantEmails = t.participants.map((p) => (p.email ?? "").toLowerCase()).join(" ");
      return subject.includes(term) || participantEmails.includes(term);
    });
  }, [threads, search]);

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6 space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Messages</h1>
        <p className="text-sm text-slate-600">
          Your communications history (email/SMS). Replies by email/SMS are not enabled yet.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search subject or participant email"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <div className="text-sm text-slate-600">Loading…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-sm text-slate-700">
          No messages yet.
        </div>
      ) : (
        <section className="space-y-3">
          {filtered.map((t) => (
            <Link
              key={t._id}
              href={`/messages/${t._id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {t.subject ?? "Conversation"}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Type: {t.kind.toUpperCase()} • Last update: {new Date(t.lastMessageAt).toLocaleString()}
                  </div>
                </div>
                <span className="text-xs text-blue-700 font-semibold">Open</span>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
