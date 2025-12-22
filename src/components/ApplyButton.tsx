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
        onClick={handleApply}
        disabled={loading}
        className={`w-full inline-block text-center rounded-md px-4 py-2 font-semibold ${loading ? 'bg-gray-400 text-white' : 'bg-indigo-600 text-white'}`}>
        {loading ? 'Applying…' : 'Apply for this property'}
      </button>
      {message && <div className="mt-2 text-sm text-gray-700">{message}</div>}
    </div>
  );
}
