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
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}


  return (
    <div style={{ padding: 24, fontFamily: "Arial, Helvetica, sans-serif" }}>
      <h2>Invite user</h2>

      <form onSubmit={handleSubmit} style={{ maxWidth: 420 }}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              border: "1px solid #d1d5db",
              borderRadius: 6,
            }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              border: "1px solid #d1d5db",
              borderRadius: 6,
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              border: "1px solid #d1d5db",
              borderRadius: 6,
            }}
          >
            <option value="APPLICANT">Applicant</option>
            <option value="TENANT">Tenant</option>
            <option value="LANDLORD">Landlord</option>
            <option value="TRADESPERSON">Tradesperson</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {error && (
          <p style={{ color: "red", marginBottom: 12 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: "rgba(71, 113, 251, 1)",
            color: "#ffffff",
            padding: "8px 14px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
          }}
        >
          {loading ? "Inviting…" : "Send invite"}
        </button>
      </form>
    </div>
  );
}
