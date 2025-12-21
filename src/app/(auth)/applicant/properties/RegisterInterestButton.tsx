"use client";

import { useState } from "react";

export default function RegisterInterestButton({ propertyId }: { propertyId: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegisterInterest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}/register-interest`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to register interest");
      setSuccess(true);
    } catch (err) {
      setError("Failed to register interest");
    } finally {
      setLoading(false);
    }
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
