"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        phone: tel,
        addressLine1,
        addressLine2,
        city,
        postcode,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }

    // Redirect to login with success flag
    router.push("/login?registered=1");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md p-6 bg-white rounded shadow"
      >
        <h1 className="text-2xl font-bold mb-4">Register</h1>

        {error && <div className="mb-3 text-red-600">{error}</div>}

        <label className="block mb-3">
          Name
          <input
            type="text"
            className="mt-1 w-full p-2 border rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label className="block mb-3">
          Email
          <input
            type="email"
            className="mt-1 w-full p-2 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block mb-3">
          Telephone
          <input
            type="tel"
            className="mt-1 w-full p-2 border rounded"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
          />
        </label>

        <label className="block mb-3">
          Address line 1
          <input
            type="text"
            className="mt-1 w-full p-2 border rounded"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
          />
        </label>

        <label className="block mb-3">
          Address line 2
          <input
            type="text"
            className="mt-1 w-full p-2 border rounded"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
          />
        </label>

        <label className="block mb-3">
          City
          <input
            type="text"
            className="mt-1 w-full p-2 border rounded"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </label>

        <label className="block mb-4">
          Postcode
          <input
            type="text"
            className="mt-1 w-full p-2 border rounded"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
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
          {loading ? "Registering…" : "Register"}
        </button>

        <div className="mt-4 text-center">
          <a
            href="/login"
            className="text-blue-600 underline text-sm hover:text-blue-800"
          >
            Already have an account? Sign in
          </a>
        </div>
      </form>
    </main>
  );
}
