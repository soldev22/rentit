"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ApplyButton({ propertyId, propertyTitle }: { propertyId: string; propertyTitle?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);

  useEffect(() => {
    // determine auth state on mount
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (!mounted) return;
        setIsAuthenticated(res.ok);
      } catch (err) {
        if (!mounted) return;
        setIsAuthenticated(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  async function handleApplyAuthenticated() {
    setMessage(null);
    setLoading(true);
    try {
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const user = session?.user;
      const body = {
        applicantId: user.id,
        applicantName: user.name || "",
        applicantEmail: user.email,
        applicantTel: (user as any).tel || "",
      };

      const res = await fetch(`/api/properties/${propertyId}/register-interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to register interest");
      } else {
        setMessage("Interest registered. We'll email you with next steps.");
      }
    } catch (err: any) {
      console.error("apply error", err);
      setMessage("An error occurred while applying. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyClick() {
    // If auth check is not yet known, wait
    if (isAuthenticated === null) return;
    if (isAuthenticated) {
      handleApplyAuthenticated();
      return;
    }
    // Not authenticated: open the guest modal instead of redirect
    setShowGuestModal(true);
  }

  return (
    <div>
      <button
        onClick={handleApplyClick}
        disabled={loading}
        className={`w-full inline-block text-center rounded-md px-4 py-2 font-semibold ${loading ? 'bg-gray-400 text-white' : 'bg-indigo-600 text-white'}`}>
        {loading ? 'Applying…' : isAuthenticated ? 'Apply for this property' : 'Sign in or apply as guest'}
      </button>
      {message && <div className="mt-2 text-sm text-gray-700">{message}</div>}

      {showGuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-md p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Apply for this property</h3>
            <p className="text-sm text-gray-600 mb-4">Provide your name, email and telephone and we'll register your interest.</p>

            <GuestApplyForm propertyId={propertyId} propertyTitle={propertyTitle} onClose={() => setShowGuestModal(false)} onSuccess={() => { setShowGuestModal(false); setMessage('Interest registered. We\'ll email you with next steps.'); }} />

            <div className="mt-4 text-right">
              <button onClick={() => setShowGuestModal(false)} className="rounded-md border px-3 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function GuestApplyForm({ propertyId, propertyTitle, onClose, onSuccess }: { propertyId: string; propertyTitle?: string; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!name || !email) {
      setError('Name and email are required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/register-interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantName: name, applicantEmail: email, applicantTel: tel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to register interest');
      } else {
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while applying');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full rounded-md border px-3 py-2" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="w-full rounded-md border px-3 py-2" />
      <input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="Telephone (optional)" className="w-full rounded-md border px-3 py-2" />
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className={`rounded-md px-3 py-2 text-white ${loading ? 'bg-gray-400' : 'bg-indigo-600'}`}>
          {loading ? 'Applying…' : 'Apply as guest'}
        </button>
        <button type="button" onClick={onClose} className="rounded-md border px-3 py-2">Close</button>
      </div>
    </form>
  );
}
