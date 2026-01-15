"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Template = {
  id: string;
  kind: string;
  name: string;
  blobName: string;
  contentType: string;
  createdAt: string;
  createdBy: string;
};

type ListResponse = {
  ok: boolean;
  kind: string;
  channel: "email" | "sms";
  activeTemplateId: string | null;
  templates: Template[];
};

type KindsResponse = {
  ok: boolean;
  kinds: string[];
};

function normalizeKind(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_").replace(/_+/g, "_");
}

export default function AdminLetterTemplatesClient() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  const [kinds, setKinds] = useState<string[]>([]);
  const [kind, setKind] = useState<string>("TENANCY_PROCEED_LETTER");
  const [newKind, setNewKind] = useState<string>("");

  const [channel, setChannel] = useState<"email" | "sms">("email");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [preview, setPreview] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (activeKind?: string, activeChannel?: "email" | "sms") => {
    setLoading(true);
    setError(null);
    try {
      const resolvedKind = activeKind ?? kind;
      const resolvedChannel = activeChannel ?? channel;
      const res = await fetch(
        `/api/admin/letter-templates?kind=${encodeURIComponent(resolvedKind)}&channel=${encodeURIComponent(resolvedChannel)}`,
        { cache: "no-store" }
      );
      const payload = (await res.json().catch(() => null)) as ListResponse | null;
      if (!res.ok || !payload?.ok) throw new Error((payload as any)?.error ?? "Failed to load templates");
      setTemplates(Array.isArray(payload.templates) ? payload.templates : []);
      setActiveTemplateId(payload.activeTemplateId ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [kind, channel]);

  const refreshKinds = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/letter-templates/kinds", { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as KindsResponse | null;
      if (!res.ok || !payload?.ok) return;
      const list = Array.isArray(payload.kinds) ? payload.kinds : [];
      setKinds(list);
      if (list.length && !list.includes(kind)) {
        // keep current kind; admin may be creating a new kind.
      }
    } catch {
      // ignore
    }
  }, [kind]);

  useEffect(() => {
    refreshKinds();
    refresh();
  }, [refresh, refreshKinds]);

  const activeName = useMemo(() => {
    if (!activeTemplateId) return null;
    return templates.find((t) => t.id === activeTemplateId)?.name ?? activeTemplateId;
  }, [templates, activeTemplateId]);

  async function upload() {
    if (!name.trim()) {
      setError("Template name is required");
      return;
    }
    if (!file) {
      setError("Choose a .txt or .md file");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const form = new FormData();
      form.append("kind", kind);
      form.append("channel", channel);
      form.append("name", name.trim());
      form.append("file", file);

      const res = await fetch("/api/admin/letter-templates", {
        method: "POST",
        body: form,
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? "Upload failed");

      setMessage("Template uploaded to Azure.");
      setName("");
      setFile(null);
      await refreshKinds();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function setActive(templateId: string | null) {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/letter-templates/active", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, channel, templateId }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? "Failed to set active template");

      setMessage(templateId ? "Active template updated." : "Active template cleared (will use built-in default where implemented).");
      setActiveTemplateId(templateId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set active template");
    } finally {
      setBusy(false);
    }
  }

  function applyNewKind() {
    const nk = normalizeKind(newKind);
    if (!nk) {
      setError("Kind is required");
      return;
    }
    setError(null);
    setMessage(null);
    setKind(nk);
    setNewKind("");
    void refresh(nk, channel);
  }

  async function loadPreview(templateId: string) {
    setPreviewLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/letter-templates/${encodeURIComponent(templateId)}`, { cache: "no-store" });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? "Failed to load preview");
      setPreview(typeof payload?.text === "string" ? payload.text : "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load preview");
      setPreview("");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function deleteTemplate(templateId: string) {
    if (!confirm("Delete this template?")) return;

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/letter-templates/${encodeURIComponent(templateId)}`, { method: "DELETE" });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? "Delete failed");

      if (activeTemplateId === templateId) {
        setActiveTemplateId(null);
      }

      setMessage("Template deleted.");
      setSelectedTemplateId("");
      setPreview("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6 space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Letter templates</h1>
        <p className="text-sm text-slate-600">
          Upload and manage templates stored in Azure Blob Storage. The active template seeds the landlord “Proceed letter” editor.
        </p>
      </header>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {message ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-700">Template kind</div>
            <select
              value={kind}
              onChange={(e) => {
                const k = e.target.value;
                setKind(k);
                setSelectedTemplateId("");
                setPreview("");
                void refresh(k, channel);
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              disabled={busy}
              aria-label="Template kind"
              title="Template kind"
            >
              <option value="TENANCY_PROCEED_LETTER">TENANCY_PROCEED_LETTER</option>
              {kinds
                .filter((k) => k !== "TENANCY_PROCEED_LETTER")
                .slice(0, 200)
                .map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
            </select>
            <div className="mt-1 text-xs text-slate-500">Active template is tracked per kind.</div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-700">Channel</div>
            <select
              value={channel}
              onChange={(e) => {
                const ch = (e.target.value === "sms" ? "sms" : "email") as "email" | "sms";
                setChannel(ch);
                setSelectedTemplateId("");
                setPreview("");
                void refresh(kind, ch);
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              disabled={busy}
              aria-label="Template channel"
              title="Template channel"
            >
              <option value="email">Email</option>
              <option value="sms">Text (SMS)</option>
            </select>
            <div className="mt-1 text-xs text-slate-500">Each kind has an active Email template and an active SMS template.</div>
          </div>

          <div className="sm:col-span-1">
            <div className="text-xs font-semibold text-slate-700">Create / switch to new kind</div>
            <div className="mt-1 flex gap-2">
              <input
                value={newKind}
                onChange={(e) => setNewKind(e.target.value)}
                placeholder="e.g. BACKGROUND_CHECKS_REQUEST"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                disabled={busy}
              />
              <button
                onClick={applyNewKind}
                disabled={busy}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Use kind
              </button>
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-700">
          <div>
            <span className="font-semibold">Active:</span> {activeName ?? "(none)"}
          </div>
          <div className="text-xs text-slate-500">If none is set, the app falls back to the built-in default template (where implemented).</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActive(null)}
            disabled={busy}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            Clear active
          </button>
          <button
            onClick={() => refresh()}
            disabled={loading || busy}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="text-sm font-semibold text-slate-900">Upload a new template</div>

        <div className="text-xs text-slate-500">
          Uploading for kind <span className="font-semibold text-slate-700">{kind}</span> and channel <span className="font-semibold text-slate-700">{channel.toUpperCase()}</span>.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <div className="text-xs font-semibold text-slate-700">Template name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Proceed letter v2"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              disabled={busy}
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-700">File (.txt / .md)</div>
            <input
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-sm"
              aria-label="Template file"
              disabled={busy}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={upload}
            disabled={busy}
            className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "Working…" : "Upload"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">Templates</div>
          <div className="text-xs text-slate-500">{templates.length} total</div>
        </div>

        {loading ? (
          <div className="text-sm text-slate-600">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="text-sm text-slate-600">No templates yet.</div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => {
              const isActive = t.id === activeTemplateId;
              return (
                <div key={t.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {t.name} {isActive ? <span className="text-xs font-semibold text-green-700">(active)</span> : null}
                      </div>
                      <div className="text-xs text-slate-500">Uploaded {new Date(t.createdAt).toLocaleString()}</div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setActive(t.id)}
                        disabled={busy}
                        className="rounded-md bg-emerald-600 text-white px-3 py-2 text-xs font-semibold disabled:opacity-50"
                      >
                        Set active
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTemplateId(t.id);
                          void loadPreview(t.id);
                        }}
                        disabled={busy}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        disabled={busy}
                        className="rounded-md border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {selectedTemplateId === t.id ? (
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-slate-700">Preview</div>
                      <pre className="mt-1 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 whitespace-pre-wrap">
                        {previewLoading ? "Loading preview…" : preview || "(empty)"}
                      </pre>
                      <div className="mt-2 text-xs text-slate-500">
                        Placeholders supported: {"{{DATE}}"}, {"{{APPLICANT_NAME}}"}, {"{{PROPERTY_LABEL}}"}.
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
