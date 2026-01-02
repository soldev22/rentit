"use client";

import { useState } from "react";
import { formatDateShort } from "@/lib/formatDate";

type User = {
  _id: string;
  email: string;
  name?: string;
  role: string;
  status: "ACTIVE" | "INVITED" | "PAUSED";
  createdAt?: string;
};

export type EditUserModalProps = {
  user: User;
  onClose: () => void;
  onSaved: (updated: User) => void;
};

export default function EditUserModal({ user, onClose, onSaved }: EditUserModalProps) {
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);

  const handleSave = () => {
    // You may want to add API call here
    onSaved({ ...user, role, status });
    onClose();
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
          <label htmlFor="edit-user-role" className="text-sm mb-1 block">Role</label>
          <select
            id="edit-user-role"
            value={role}
            onChange={e => setRole(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          >
            <option value="ADMIN">Admin</option>
            <option value="LANDLORD">Landlord</option>
            <option value="TENANT">Tenant</option>
            <option value="APPLICANT">Applicant</option>
            <option value="TRADESPERSON">Tradesperson</option>
          </select>
        </div>
        <div className="mb-3">
          <label htmlFor="edit-user-status" className="text-sm mb-1 block">Status</label>
          <select
            id="edit-user-status"
            value={status}
            onChange={e => setStatus(e.target.value as User["status"])}
            className="border rounded px-2 py-1 w-full"
          >
            <option value="ACTIVE">Active</option>
            <option value="INVITED">Invited</option>
            <option value="PAUSED">Paused</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
            type="button"
          >
            Save
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-3">
          Created: {user.createdAt ? formatDateShort(user.createdAt) : "-"}
        </div>
      </div>
    </div>
  );
}