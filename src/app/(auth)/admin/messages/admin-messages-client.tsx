"use client";

import { useEffect, useMemo, useState } from "react";

type AdminUser = {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  commsEnabled?: boolean;
  profile?: {
    phone?: string;
    contactPreferences?: {
      email?: boolean;
      sms?: boolean;
    };
  };
};

export default function AdminMessagesClient() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const [kind, setKind] = useState<"adhoc" | "legal" | "maintenance">("adhoc");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        setLoadingUsers(true);
        const res = await fetch("/api/admin/users");
        if (!res.ok) throw new Error("Failed to load users");
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load users");
      } finally {
        setLoadingUsers(false);
      }
    }

    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => {
      const email = (u.email ?? "").toLowerCase();
      const name = (u.name ?? "").toLowerCase();
      return email.includes(term) || name.includes(term);
    });
  }, [users, userSearch]);

  const selected = useMemo(() => users.find((u) => u._id === selectedUserId) ?? null, [users, selectedUserId]);

  async function send() {
    if (!selectedUserId) {
      setError("Select a user");
      return;
    }
    if (!body.trim()) {
      setError("Message body is required");
      return;
    }

    setSending(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientUserId: selectedUserId,
          kind,
          subject: subject.trim() || undefined,
          body: body.trim(),
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? "Failed to send");

      setMessage("Message queued for email + SMS (where opted-in).");
      setBody("");
      setSubject("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6 space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Admin messages</h1>
        <p className="text-sm text-slate-600">Send an outbound message to a user (email + SMS).</p>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-700">Find user</div>
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search name/email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-700">Recipient</div>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              disabled={loadingUsers}
              aria-label="Recipient"
              title="Recipient"
            >
              <option value="">{loadingUsers ? "Loading…" : "Select a user"}</option>
              {filteredUsers.slice(0, 200).map((u) => (
                <option key={u._id} value={u._id}>
                  {(u.name ? `${u.name} – ` : "") + (u.email ?? "(no email)")}
                </option>
              ))}
            </select>
            {filteredUsers.length > 200 ? (
              <div className="mt-1 text-xs text-slate-500">Showing first 200 results, refine search.</div>
            ) : null}
          </div>
        </div>

        {selected ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="font-semibold">Recipient summary</div>
            <div>Email: {selected.email ?? "—"}</div>
            <div>Phone: {selected.profile?.phone ?? "—"}</div>
            <div>SMS opt-in: {selected.profile?.contactPreferences?.sms ? "Yes" : "No"}</div>
            <div>Comms enabled: {selected.commsEnabled === false ? "No" : "Yes"}</div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-700">Kind</div>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              aria-label="Kind"
              title="Kind"
            >
              <option value="adhoc">Ad hoc</option>
              <option value="legal">Legal</option>
              <option value="maintenance">House issue</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <div className="text-xs font-semibold text-slate-700">Subject</div>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Optional"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-700">Message</div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Type message…"
          />
          <div className="mt-1 text-xs text-slate-500">Outbound only for now. Delivery attempts are recorded.</div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={send}
            disabled={sending}
            className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send (Email + SMS)"}
          </button>
        </div>
      </section>
    </main>
  );
}
