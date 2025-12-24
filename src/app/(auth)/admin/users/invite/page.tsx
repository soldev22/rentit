"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteUserPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("APPLICANT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setError(null);

  try {
    const res = await fetch("/api/admin/users/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, role }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 409) {
        throw new Error("User already exists");
      }
      throw new Error(data?.error || "Failed to send invite");
    }

    router.push("/admin/users");
  } catch (err: unknown) {
    if (err instanceof Error) {
      setError(err.message);
    } else {
      setError(String(err));
    }
  } finally {
    setLoading(false);
  }
}


  return (
    <div className="p-6 font-sans">
      <h2>Invite user</h2>

      <form onSubmit={handleSubmit} className="max-w-[420px]">
        <div className="mb-3">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            required
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="mb-3">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="role">Role</label>
          <select
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="APPLICANT">Applicant</option>
            <option value="TENANT">Tenant</option>
            <option value="LANDLORD">Landlord</option>
            <option value="TRADESPERSON">Tradesperson</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {error && (
          <p className="text-red-500 mb-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-3.5 py-2 rounded-md border-none cursor-pointer"
        >
          {loading ? "Inviting…" : "Send invite"}
        </button>
      </form>
    </div>
  );
}
