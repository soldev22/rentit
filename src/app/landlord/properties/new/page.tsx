
"use client";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem",
  marginTop: "0.3rem",
  borderRadius: "4px",
  border: "1px solid #ccc",
  fontSize: "0.95rem",
};

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPropertyPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [rentPcm, setRentPcm] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/landlord/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        address: { line1, city, postcode },
        rentPcm: Number(rentPcm),
      }),
    });

    if (!res.ok) {
      alert("Failed to create property");
      return;
    }

    router.push("/landlord/properties");
  }

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: "700px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ marginBottom: "1.5rem" }}>
        Create Property
      </h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          background: "#fff",
          padding: "1.5rem",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <label>
          <strong>Title</strong>
          <input
            style={inputStyle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <label>
          <strong>Description</strong>
          <textarea
            style={{ ...inputStyle, minHeight: "80px" }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label>
          <strong>Address line 1</strong>
          <input
            style={inputStyle}
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            required
          />
        </label>

        <div style={{ display: "flex", gap: "1rem" }}>
          <label style={{ flex: 1 }}>
            <strong>City</strong>
            <input
              style={inputStyle}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </label>

          <label style={{ flex: 1 }}>
            <strong>Postcode</strong>
            <input
              style={inputStyle}
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              required
            />
          </label>
        </div>

        <label>
          <strong>Rent (GBP per month)</strong>
          <input
            type="number"
            style={inputStyle}
            value={rentPcm}
            onChange={(e) => setRentPcm(e.target.value)}
            required
          />
        </label>

        {/* CLEAR SUBMIT BUTTON */}
        <button
          type="submit"
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "#6b4eff",
            color: "#fff",
            fontWeight: 600,
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Create Draft Property
        </button>
      </form>
    </div>
  );
}
