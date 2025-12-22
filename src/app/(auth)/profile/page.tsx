"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProfilePage() {
  const [interests, setInterests] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const [profile, setProfile] = useState({
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // LOAD EXISTING DATA
  useEffect(() => {
    async function loadProfile() {
      const res = await fetch("/api/profile");
      if (!res.ok) {
        setLoading(false);
        return;
      }

      const data = await res.json();

      setEmail(data.email ?? "");
      setName(data.name ?? "");

      setProfile({
        phone: data.profile?.phone ?? "",
        addressLine1: data.profile?.address?.line1 ?? "",
        addressLine2: data.profile?.address?.line2 ?? "",
        city: data.profile?.address?.city ?? "",
        postcode: data.profile?.address?.postcode ?? "",
      });

      // Fetch interests for this user
      try {
        const interestsRes = await fetch("/api/applicant/interests");
        if (interestsRes.ok) {
          const interestsData = await interestsRes.json();
          setInterests(interestsData.interests || []);
        }
      } catch (e) {}

      setLoading(false);
    }

    loadProfile();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        profile: {
          phone: profile.phone,
          address: {
            line1: profile.addressLine1,
            line2: profile.addressLine2,
            city: profile.city,
            postcode: profile.postcode,
          },
        },
      }),
    });

    setSaving(false);
    setMessage(res.ok ? "Profile updated" : "Failed to save profile");
  }

  const isIncomplete =
    !name ||
    !profile.phone ||
    !profile.addressLine1 ||
    !profile.city ||
    !profile.postcode;

  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily: "Arial, Helvetica, sans-serif" }}>
        Loading profile…
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "Arial, Helvetica, sans-serif",
        maxWidth: 520,
      }}
    >
      <h2>My profile</h2>

      {/* Interests Section */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Registered Interests</h3>
        {interests.length === 0 ? (
          <div style={{ color: "#64748b", fontSize: 14 }}>No interests registered yet.</div>
        ) : (
          <ul style={{ paddingLeft: 0, listStyle: "none" }}>
            {interests.map((interest) => (
              <li key={interest.propertyId} style={{ marginBottom: 10, borderBottom: "1px solid #e5e7eb", paddingBottom: 8 }}>
                <Link href={`/applicant/properties/${interest.propertyId}`} style={{ color: "#1e40af", fontWeight: 500, textDecoration: "underline" }}>
                  {interest.propertyTitle || "Property"}
                </Link>
                <div style={{ fontSize: 13, color: "#475569" }}>{interest.date ? new Date(interest.date).toLocaleDateString() : ""}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isIncomplete && (
        <div
          style={{
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          Please complete your profile. Missing details may delay bookings or
          communication.
        </div>
      )}

      <form onSubmit={saveProfile}>
        {/* EMAIL (READ ONLY) */}
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input
            value={email}
            disabled
            style={{
              width: "100%",
              padding: 8,
              border: "1px solid #d1d5db",
              borderRadius: 6,
              backgroundColor: "#f8fafc",
              color: "#475569",
              cursor: "not-allowed",
            }}
          />
          <small style={{ fontSize: 12, color: "#64748b" }}>
            Email address can only be changed by an administrator.
          </small>
        </div>

        {/* NAME */}
        <div style={{ marginBottom: 12 }}>
          <label>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* PHONE */}
        <div style={{ marginBottom: 12 }}>
          <label>Phone</label>
          <input
            value={profile.phone}
            onChange={(e) =>
              setProfile({ ...profile, phone: e.target.value })
            }
            style={inputStyle}
          />
        </div>

        {/* ADDRESS LINE 1 */}
        <div style={{ marginBottom: 12 }}>
          <label>Address line 1</label>
          <input
            value={profile.addressLine1}
            onChange={(e) =>
              setProfile({ ...profile, addressLine1: e.target.value })
            }
            style={inputStyle}
          />
        </div>

        {/* ADDRESS LINE 2 */}
        <div style={{ marginBottom: 12 }}>
          <label>Address line 2</label>
          <input
            value={profile.addressLine2}
            onChange={(e) =>
              setProfile({ ...profile, addressLine2: e.target.value })
            }
            style={inputStyle}
          />
        </div>

        {/* CITY */}
        <div style={{ marginBottom: 12 }}>
          <label>City</label>
          <input
            value={profile.city}
            onChange={(e) =>
              setProfile({ ...profile, city: e.target.value })
            }
            style={inputStyle}
          />
        </div>

        {/* POSTCODE */}
        <div style={{ marginBottom: 12 }}>
          <label>Postcode</label>
          <input
            value={profile.postcode}
            onChange={(e) =>
              setProfile({ ...profile, postcode: e.target.value })
            }
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            backgroundColor: "#1e40af",
            color: "#fff",
            padding: "8px 14px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            marginTop: 8,
          }}
        >
          {saving ? "Saving…" : "Save profile"}
        </button>

        {message && <p style={{ marginTop: 12 }}>{message}</p>}
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 8,
  border: "1px solid #d1d5db",
  borderRadius: 6,
};
