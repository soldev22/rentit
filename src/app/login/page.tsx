"use client";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      {params.get("registered") && (
        <div className="mb-2 text-green-600">Registration successful! Please log in.</div>
      )}
      {error && <div className="mb-2 text-red-600">{error}</div>}
      <label className="block mb-2">
        Email
        <input type="email" className="mt-1 w-full p-2 border rounded" value={email} onChange={e => setEmail(e.target.value)} required />
      </label>
      <label className="block mb-4">
        Password
        <input type="password" className="mt-1 w-full p-2 border rounded" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
      </label>
      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50" disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>
      <div className="mt-4 text-center">
        <a href="/password-reset/request" className="text-blue-600 underline text-sm hover:text-blue-800">Forgot password?</a>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
