"use client";
import { useState } from "react";

type User = {
  _id: string;
  email: string;
  name?: string;
  role: string;
  status: "ACTIVE" | "INVITED" | "PAUSED";
  description?: string;
  profile?: {
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      postcode?: string;
      country?: string;
    };
  };
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
  addressVerified?: boolean;
  profileCompleteness?: number;
  createdAt?: string;
  updatedAt?: string;
};


import { useEffect } from "react";
import { formatDateTime } from "@/lib/formatDate";

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
      <div onClick={onClose} className="fixed inset-0 bg-black/45 z-50" />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[420px] bg-white rounded-xl shadow-2xl z-[51] font-sans">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="m-0">Edit user</h3>
          <p className="m-0 mt-1 text-sm text-gray-500">
            {user.email}
          </p>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Show all available user details */}
          <div className="mb-4">
            <label className="block text-sm mb-1.5 font-semibold" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full min-h-[60px] p-2 border border-gray-300 rounded-md text-sm mb-2.5 resize-vertical"
              placeholder="Enter a description for this user..."
            />
            <div className="text-sm mb-1"><b>Name:</b> {latestUser.name || <span className="text-gray-400">(none)</span>}</div>
            <div className="text-sm mb-1"><b>Email:</b> {user.email}</div>
            {/* Support both user.phone/address and user.profile.phone/address */}
            {(user.phone || user.profile?.phone) && (
              <div className="text-sm mb-1"><b>Phone:</b> {user.phone || user.profile?.phone}</div>
            )}
            {(user.address || user.profile?.address) && (
              <div className="text-sm mb-1">
                <b>Address:</b> {user.address?.line1 || user.profile?.address?.line1 || ''}
                {user.address?.line2 || user.profile?.address?.line2 ? ', ' + (user.address?.line2 || user.profile?.address?.line2) : ''}
                {user.address?.city || user.profile?.address?.city ? ', ' + (user.address?.city || user.profile?.address?.city) : ''}
                {user.address?.postcode || user.profile?.address?.postcode ? ', ' + (user.address?.postcode || user.profile?.address?.postcode) : ''}
                {user.address?.country || user.profile?.address?.country ? ', ' + (user.address?.country || user.profile?.address?.country) : ''}
              </div>
            )}
            {typeof user.addressVerified !== 'undefined' && (
              <div className="text-sm mb-1"><b>Address Verified:</b> {user.addressVerified ? 'Yes' : 'No'}</div>
            )}
            {typeof user.profileCompleteness !== 'undefined' && (
              <div className="text-sm mb-1"><b>Profile Completeness:</b> {user.profileCompleteness}%</div>
            )}
            {user.createdAt && <div className="text-sm mb-1"><b>Created:</b> {formatDateTime(user.createdAt)}</div>}
            {user.updatedAt && <div className="text-sm mb-1"><b>Updated:</b> {formatDateTime(user.updatedAt)}</div>}
          </div>
          <div className="mb-4">
            <label className="block text-sm mb-1.5 font-semibold" htmlFor="role-select">
              Role
            </label>
            <select
              id="role-select"
              value={role ?? ""}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              aria-label="Role"
            >
              <option value="APPLICANT">Applicant</option>
              <option value="TENANT">Tenant</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm mb-1.5 font-semibold" htmlFor="status-select">
              Status
            </label>
            <select
              id="status-select"
              value={status ?? ""}
              onChange={(e) =>
                setStatus((e.target.value || "ACTIVE") as "ACTIVE" | "INVITED" | "PAUSED")
              }
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              aria-label="Status"
            >
              <option value="ACTIVE">Active</option>
              <option value="INVITED">Invited</option>
              <option value="PAUSED">Paused</option>
            </select>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-md text-sm mb-3">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-gray-200 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-2 border border-gray-300 rounded-md bg-white cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={save}
            disabled={saving}
            className="px-3.5 py-2 rounded-md border-none bg-blue-600 text-white cursor-pointer disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          </div>
        </div>
      </>
    );
  }
