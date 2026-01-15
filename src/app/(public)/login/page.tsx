// NOTE:
// Using custom /login page.
// Password login works.
// Magic-link UI intentionally deferred.
// Do not reintroduce default NextAuth sign-in page.
// AUTH PATTERN
// This is the only sign-in UI.
// Do not reintroduce NextAuth default sign-in.
// See AUTH_PATTERN.md before making changes.

"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showMagic, setShowMagic] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [magicError, setMagicError] = useState("");
  const [magicLoading, setMagicLoading] = useState(false);

  const params = useSearchParams();

  const callbackUrlParam = params.get("callbackUrl");
  const callbackUrl =
    callbackUrlParam && callbackUrlParam.startsWith("/") ? callbackUrlParam : "/";

  // ✅ FIXED: single, correct submit handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: true, // let NextAuth handle navigation
    });

    // Only reached on error
    if (res?.error) {
      setLoading(false);
      setError("Invalid email or password");
    }
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setMagicLoading(true);
    setMagicError("");
    setMagicSent(false);

    const res = await signIn("email", {
      email: magicEmail,
      callbackUrl,
      redirect: false,
    });

    setMagicLoading(false);

    if (res?.error) {
      setMagicError("Could not send magic link. Please try again.");
      return;
    }

    setMagicSent(true);
  }

  return (
    <div className="w-full max-w-sm p-6 bg-white rounded shadow">
      <form onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold mb-4">Sign in</h1>

        {params.get("registered") && (
          <div className="mb-2 text-green-600">
            Registration successful! Please sign in.
          </div>
        )}

        {params.get("reset") && (
          <div className="mb-2 text-green-600">
            Password reset! Please sign in.
          </div>
        )}

        {error && <div className="mb-2 text-red-600">{error}</div>}

        <label className="block mb-4">
          Email
          <input
            type="email"
            className="mt-1 w-full p-2 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block mb-4">
          Password
          <input
            type="password"
            className="mt-1 w-full p-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div className="mt-4 text-center">
          <Link
            href="/password-reset/request"
            className="text-blue-600 underline text-sm hover:text-blue-800"
          >
            Forgot password?
          </Link>
        </div>

        <div className="mt-2 text-center">
          <Link
            href="/register"
            className="text-blue-600 underline text-sm hover:text-blue-800"
          >
            Don&apos;t have an account? Register
          </Link>
        </div>
      </form>

      <div className="my-6 flex items-center">
        <div className="flex-grow border-t border-gray-200" />
        <span className="mx-2 text-gray-400 text-xs">or</span>
        <div className="flex-grow border-t border-gray-200" />
      </div>

      {!showMagic ? (
        <button
          className="w-full bg-gray-100 border border-gray-300 py-2 rounded hover:bg-gray-200 text-gray-800 text-sm font-medium"
          onClick={() => setShowMagic(true)}
        >
          Sign in with email link
        </button>
      ) : (
        <form onSubmit={handleMagic} className="mt-2">
          <label htmlFor="magic-email" className="block mb-2 text-sm">
            Email address
          </label>
          <input
            id="magic-email"
            name="magic-email"
            type="email"
            placeholder="you@example.com"
            title="Email address"
            aria-label="Email address"
            className="w-full p-2 border rounded mb-2"
            value={magicEmail}
            onChange={(e) => setMagicEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
            disabled={magicLoading}
          >
            {magicLoading ? "Sending..." : "Send magic link"}
          </button>

          {magicError && (
            <div className="mt-2 text-red-600 text-sm">{magicError}</div>
          )}

          {magicSent && (
            <div className="mt-2 text-green-600 text-sm">
              Check your email for a sign-in link.
            </div>
          )}
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
