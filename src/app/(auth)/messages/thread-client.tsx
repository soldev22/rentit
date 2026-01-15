"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

type Message = {
  _id: string;
  subject?: string;
  body: string;
  kind: "adhoc" | "legal" | "maintenance";
  createdAt: string;
  senderRole?: string;
};

export default function ThreadClient() {
  const params = useParams<{ threadId: string }>();
  const threadId = params?.threadId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!threadId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/messages/threads/${threadId}`);
        if (!res.ok) throw new Error("Failed to load thread");
        const data = await res.json();
        setMessages(Array.isArray(data?.messages) ? data.messages : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load thread");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [threadId]);

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Conversation</h1>
          <p className="text-sm text-slate-600">
            This is your official communication record.
          </p>
        </div>
        <Link href="/messages" className="text-sm font-semibold text-blue-700 hover:underline">
          Back
        </Link>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex gap-3 flex-wrap">
        <a
          href={`/api/messages/threads/${threadId}/export?format=csv`}
          className="rounded-md bg-slate-900 text-white px-3 py-2 text-xs font-semibold"
        >
          Export CSV
        </a>
        <a
          href={`/api/messages/threads/${threadId}/export?format=pdf`}
          className="rounded-md bg-slate-900 text-white px-3 py-2 text-xs font-semibold"
        >
          Export PDF
        </a>
      </div>

      {loading ? (
        <div className="text-sm text-slate-600">Loading…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : messages.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-sm text-slate-700">
          No messages in this thread.
        </div>
      ) : (
        <section className="space-y-3">
          {messages.map((m) => (
            <article key={m._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">
                  {m.subject ?? "Message"}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(m.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-600">
                {m.senderRole ? `From: ${m.senderRole}` : ""} • {m.kind.toUpperCase()}
              </div>
              <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-800 font-sans">{m.body}</pre>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
