"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("RENTER");
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
      body: JSON.stringify({ name, email, tel, password, role })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }
    router.push("/login?registered=1");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Register</h1>
        {error && <div className="mb-2 text-red-600">{error}</div>}
        <label className="block mb-2">
          Name
          <input type="text" className="mt-1 w-full p-2 border rounded" value={name} onChange={e => setName(e.target.value)} required />
        </label>
        <label className="block mb-2">
          Email
          <input type="email" className="mt-1 w-full p-2 border rounded" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <label className="block mb-2">
          Telephone
          <input type="tel" className="mt-1 w-full p-2 border rounded" value={tel} onChange={e => setTel(e.target.value)} required />
        </label>
        <label className="block mb-2">
          Password
          <input type="password" className="mt-1 w-full p-2 border rounded" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        </label>
        <label className="block mb-4">
          Role
          <select className="mt-1 w-full p-2 border rounded" value={role} onChange={e => setRole(e.target.value)}>
            <option value="RENTER">Renter</option>
            <option value="LANDLORD">Landlord</option>
          </select>
        </label>
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
    </main>
  );
}
