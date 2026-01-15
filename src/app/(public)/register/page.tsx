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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedTel = tel.trim();

    if (!trimmedName || !trimmedEmail || !trimmedTel || !password) {
      setLoading(false);
      setError("Please complete all required fields.");
      return;
    }

    if (password.length < 6) {
      setLoading(false);
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setLoading(false);
      setError("Passwords do not match.");
      return;
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: trimmedName,
        email: trimmedEmail,
        password,
        phone: trimmedTel,
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
    router.push("/login?registered=1&callbackUrl=%2F");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md p-6 bg-white rounded shadow"
      >
        <h1 className="text-2xl font-bold mb-4">Register</h1>

        <p className="mb-3 text-sm text-gray-600">
          Fields marked with <span className="text-red-600">*</span> are required.
        </p>

        {error && (
          <div className="mb-3 text-red-600" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <label className="block mb-3">
          <span>
            Name
            <span className="ml-1 text-red-600" aria-hidden="true">
              *
            </span>
          </span>
          <input
            type="text"
            className="mt-1 w-full p-2 border rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label className="block mb-3">
          <span>
            Email
            <span className="ml-1 text-red-600" aria-hidden="true">
              *
            </span>
          </span>
          <input
            type="email"
            className="mt-1 w-full p-2 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block mb-3">
          <span>
            Telephone
            <span className="ml-1 text-red-600" aria-hidden="true">
              *
            </span>
          </span>
          <input
            type="tel"
            className="mt-1 w-full p-2 border rounded"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
            required
            pattern="^0[0-9]{10}$|^\+44[0-9]{10}$"
            title="Enter a valid UK mobile number (07... or +447...)"
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
          <span>
            Password (min 6 characters)
            <span className="ml-1 text-red-600" aria-hidden="true">
              *
            </span>
          </span>
          <input
            type="password"
            className="mt-1 w-full p-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        <label className="block mb-4">
          <span>
            Confirm password
            <span className="ml-1 text-red-600" aria-hidden="true">
              *
            </span>
          </span>
          <input
            type="password"
            className="mt-1 w-full p-2 border rounded"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        {/* All users register as applicants */}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Registering…" : "Register"}
        </button>

        {error && (
          <div className="mt-2 text-sm text-red-600" role="alert" aria-live="polite">
            {error}
          </div>
        )}

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
