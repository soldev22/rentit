"use client";

import { useState } from "react";

type User = {
  _id: string;
  email: string;
  name?: string;
  role: string;
  status: "ACTIVE" | "INVITED" | "PAUSED";
};


export default function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: (updated: { _id: string; role: string; status: "ACTIVE" | "INVITED" | "PAUSED" }) => void;

}) {
  const [role, setRole] = useState(user.role);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(user.status);

  async function save() {
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/admin/users/${user._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role,status}),
    });

    setSaving(false);

    if (!res.ok) {
      setError("Failed to update user");
      return;
    }

   onSaved({ _id: user._id, role,status });
onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 50,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 420,
          background: "#ffffff",
          borderRadius: 10,
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          zIndex: 51,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <h3 style={{ margin: 0 }}>Edit user</h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
            {user.email}
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              Role
            </label>

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                fontSize: 14,
              }}
            >
              <option value="ADMIN">Admin</option>
              <option value="LANDLORD">Landlord</option>
              <option value="TENANT">Tenant</option>
              <option value="APPLICANT">Applicant</option>
              <option value="TRADESPERSON">Tradesperson</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
  <label
    style={{
      display: "block",
      fontSize: 13,
      marginBottom: 6,
      fontWeight: 600,
    }}
  >
    Status
  </label>

  <select
    value={status}
    onChange={(e) =>
      setStatus(e.target.value as "ACTIVE" | "INVITED" | "PAUSED")
    }
    style={{
      width: "100%",
      padding: "8px 10px",
      borderRadius: 6,
      border: "1px solid #d1d5db",
      fontSize: 14,
    }}
  >
    <option value="ACTIVE">Active</option>
    <option value="INVITED">Invited</option>
    <option value="PAUSED">Paused</option>
  </select>
</div>


          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                padding: 10,
                borderRadius: 6,
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
              background: "rgba(71, 113, 251, 1)",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </>
  );
}
