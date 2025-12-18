"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Suspense } from "react";

function PasswordResetConfirmForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Reset failed");
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/api/auth/signin?reset=1"), 2000);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
        {error && <div className="mb-2 text-red-600">{error}</div>}
        {success ? (
          <div className="mb-2 text-green-600">Password reset! Redirecting to sign in...</div>
        ) : (
          <>
            <label className="block mb-2">
              New Password
              <input type="password" className="mt-1 w-full p-2 border rounded" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </label>
            <label className="block mb-4">
              Confirm Password
              <input type="password" className="mt-1 w-full p-2 border rounded" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} />
            </label>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </>
        )}
      </form>
    </main>
  );
}

export default function PasswordResetConfirmPage() {
  return (
    <Suspense>
      <PasswordResetConfirmForm />
    </Suspense>
  );
}
