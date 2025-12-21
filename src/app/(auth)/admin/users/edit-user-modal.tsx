"use client";
import { useState } from "react";

type User = {
  _id: string;
  email: string;
  name?: string;
  role: string;
  status: "ACTIVE" | "INVITED" | "PAUSED";
  description?: string;
  profile?: any;
  phone?: string;
  address?: any;
  addressVerified?: boolean;
  profileCompleteness?: number;
  createdAt?: string;
  updatedAt?: string;
};


import { useEffect } from "react";

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
  const [latestUser, setLatestUser] = useState<User>(user);
  const [description, setDescription] = useState<string>(user.description || "");

  // Fetch latest user data on open
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`/api/admin/users/${user._id}`);
        if (res.ok) {
          const data = await res.json();
          setLatestUser(data.user);
        }
      } catch {}
    }
    fetchUser();
  }, [user._id]);

  async function save() {
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/admin/users/${user._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, status, description }),
    });

    setSaving(false);

    if (!res.ok) {
      setError("Failed to update user");
      return;
    }

    // Refetch latest user data after save
    try {
      const res2 = await fetch(`/api/admin/users/${user._id}`);
      if (res2.ok) {
        const data = await res2.json();
        setLatestUser(data.user);
      }
    } catch {}

    onSaved({ _id: user._id, role, status });
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
          {/* Show all available user details */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{
                width: "100%",
                minHeight: 60,
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                fontSize: 14,
                marginBottom: 10,
                resize: "vertical"
              }}
              placeholder="Enter a description for this user..."
            />
            <div style={{ fontSize: 14, marginBottom: 4 }}><b>Name:</b> {latestUser.name || <span style={{ color: '#aaa' }}>(none)</span>}</div>
            <div style={{ fontSize: 14, marginBottom: 4 }}><b>Email:</b> {user.email}</div>
            {/* Support both user.phone/address and user.profile.phone/address */}
            {(user.phone || user.profile?.phone) && (
              <div style={{ fontSize: 14, marginBottom: 4 }}><b>Phone:</b> {user.phone || user.profile?.phone}</div>
            )}
            {(user.address || user.profile?.address) && (
              <div style={{ fontSize: 14, marginBottom: 4 }}>
                <b>Address:</b> {user.address?.line1 || user.profile?.address?.line1 || ''}
                {user.address?.line2 || user.profile?.address?.line2 ? ', ' + (user.address?.line2 || user.profile?.address?.line2) : ''}
                {user.address?.city || user.profile?.address?.city ? ', ' + (user.address?.city || user.profile?.address?.city) : ''}
                {user.address?.postcode || user.profile?.address?.postcode ? ', ' + (user.address?.postcode || user.profile?.address?.postcode) : ''}
                {user.address?.country || user.profile?.address?.country ? ', ' + (user.address?.country || user.profile?.address?.country) : ''}
              </div>
            )}
            {typeof user.addressVerified !== 'undefined' && (
              <div style={{ fontSize: 14, marginBottom: 4 }}><b>Address Verified:</b> {user.addressVerified ? 'Yes' : 'No'}</div>
            )}
            {typeof user.profileCompleteness !== 'undefined' && (
              <div style={{ fontSize: 14, marginBottom: 4 }}><b>Profile Completeness:</b> {user.profileCompleteness}%</div>
            )}
            {user.createdAt && <div style={{ fontSize: 14, marginBottom: 4 }}><b>Created:</b> {new Date(user.createdAt).toLocaleString()}</div>}
            {user.updatedAt && <div style={{ fontSize: 14, marginBottom: 4 }}><b>Updated:</b> {new Date(user.updatedAt).toLocaleString()}</div>}
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
              Role
            </label>
            <select
              value={role ?? ""}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                fontSize: 14,
              }}
            >
              <option value="APPLICANT">Applicant</option>
              <option value="TENANT">Tenant</option>
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
              value={status ?? ""}
              onChange={(e) =>
                setStatus((e.target.value || "ACTIVE") as "ACTIVE" | "INVITED" | "PAUSED")
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
