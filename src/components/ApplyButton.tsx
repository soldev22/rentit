"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApplyButton({ propertyId, propertyTitle }: { propertyId: string; propertyTitle?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleApply() {
    setMessage(null);
    setLoading(true);

    try {
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) {
        // Not authenticated: redirect to sign-in with callback
        const cb = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/signin?callbackUrl=${cb}`;
        return;
      }

      const session = await sessionRes.json();
      const user = session?.user;
      if (!user?.id || !user?.email) {
        const cb = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/signin?callbackUrl=${cb}`;
        return;
      }

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
        // Optionally refresh profile or navigate to applicant profile
        // router.push('/profile');
      }
    } catch (err: any) {
      console.error("apply error", err);
      setMessage("An error occurred while applying. Please try again.");
    } finally {
      setLoading(false);
    }
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
