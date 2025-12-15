"use client";
import { useState } from "react";

export default function PasswordResetRequestPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    const res = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Request failed");
      return;
    }
    setSuccess(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Forgot Password</h1>
        {error && <div className="mb-2 text-red-600">{error}</div>}
        {success ? (
          <div className="mb-2 text-green-600">If your email exists, a reset link has been sent.</div>
        ) : (
          <>
            <label className="block mb-4">
              Email
              <input type="email" className="mt-1 w-full p-2 border rounded" value={email} onChange={e => setEmail(e.target.value)} required />
            </label>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50" disabled={loading}>
              {loading ? "Requesting..." : "Send Reset Link"}
            </button>
          </>
        )}
      </form>
    </main>
  );
}
