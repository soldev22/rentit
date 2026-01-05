"use client";

import { useState } from "react";
import { formatDateShort } from "@/lib/formatDate";

const ROLE_OPTIONS = ["ADMIN", "LANDLORD", "TENANT", "APPLICANT", "TRADESPERSON"] as const;
type RoleOption = (typeof ROLE_OPTIONS)[number];

const STATUS_OPTIONS = ["ACTIVE", "INVITED", "PAUSED"] as const;
type StatusOption = (typeof STATUS_OPTIONS)[number];

type EditableUser = {
  _id: string;
  email: string;
  name?: string;
  role: string;
  status: string;
  createdAt?: string;
};

const toRoleOption = (value: string): RoleOption =>
  (ROLE_OPTIONS.find((option) => option === value) ?? "APPLICANT");

const toStatusOption = (value: string): StatusOption =>
  (STATUS_OPTIONS.find((option) => option === value) ?? "INVITED");

export type EditUserModalProps = {
  user: EditableUser;
  onClose: () => void;
  onSaved: (updated: EditableUser) => void;
};

export default function EditUserModal({ user, onClose, onSaved }: EditUserModalProps) {
  const [role, setRole] = useState<RoleOption>(toRoleOption(user.role));
  const [status, setStatus] = useState<StatusOption>(toStatusOption(user.status));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role, status }),
      });

      if (res.status === 401) {
        setError("You are not authorized to perform this action. Please log in again.");
        return;
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to update user");
      }

      const updated = (await res.json()) as EditableUser;
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update user");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px]">
        <h2 className="text-lg font-semibold mb-4">Edit User</h2>
        <div className="mb-3">
          <div className="text-sm mb-1">Name</div>
          <div className="font-medium">{user.name || "—"}</div>
        </div>
        <div className="mb-3">
          <div className="text-sm mb-1">Email</div>
          <div className="font-mono">{user.email}</div>
        </div>
        <div className="mb-3">
          <label htmlFor="edit-user-role" className="text-sm mb-1 block">
            Role
          </label>
          <select
            id="edit-user-role"
            value={role}
            onChange={(e) => setRole(e.target.value as RoleOption)}
            className="border rounded px-2 py-1 w-full"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0) + option.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label htmlFor="edit-user-status" className="text-sm mb-1 block">
            Status
          </label>
          <select
            id="edit-user-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusOption)}
            className="border rounded px-2 py-1 w-full"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0) + option.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <div className="text-xs text-gray-500 mt-3">
          Created: {user.createdAt ? formatDateShort(user.createdAt) : "-"}
        </div>
      </div>
    </div>
  );
}