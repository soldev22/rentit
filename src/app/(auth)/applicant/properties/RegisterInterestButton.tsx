"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function RegisterInterestButton({ propertyId, hasRegisteredInterest }: { propertyId: string, hasRegisteredInterest?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  async function handleRegisterInterest() {
    setLoading(true);
    setError(null);
    try {
      // Use session user info if available
      const user = session?.user;
      const payload = {
        applicantId: user?.id || "",
        applicantName: user?.name || "",
        applicantEmail: user?.email || "",
        applicantTel: user?.tel || "",
      };
      if (!payload.applicantId || !payload.applicantName || !payload.applicantEmail) {
        setError("Missing applicant information. Please ensure you are logged in.");
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/properties/${propertyId}/register-interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to register interest");
      setSuccess(true);
    } catch (err) {
      setError("Failed to register interest");
    } finally {
      setLoading(false);
    }
  }

  if (hasRegisteredInterest) {
    return <div className="mt-4 text-gray-500 font-semibold">Interest already registered</div>;
  }
  if (success) return <div className="mt-4 text-green-600 font-semibold">Interest registered!</div>;

  return (
    <div className="mt-4">
      <button
        onClick={handleRegisterInterest}
        className="px-6 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
        disabled={loading}
      >
        {loading ? "Registering..." : "Register Interest"}
      </button>
      {error && <div className="text-red-600 mt-2">{error}</div>}
    </div>
  );
}
