
"use client";
import React, { useState } from "react";
import EditUserModal from "@/app/(auth)/admin/users/edit-user-modal";

type User = {
  _id: string;
  name: string;
  email: string;
  tel: string;
  role: string;
  createdAt: string;
  status: "ACTIVE" | "INVITED" | "PAUSED";
  // Add other fields as needed
};

export default function ManageUserModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user details on mount
  React.useEffect(() => {
    async function fetchUser() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        if (!res.ok) throw new Error("Failed to fetch user");
        const data = await res.json();
        // Ensure status is present and normalized, fallback to 'ACTIVE' if missing or invalid
        const validStatuses = ["ACTIVE", "INVITED", "PAUSED"] as const;
        const status =
          validStatuses.includes((data.user.status ?? "ACTIVE").toUpperCase())
            ? (data.user.status ?? "ACTIVE").toUpperCase()
            : "ACTIVE";
        setUser({ ...data.user, status: status as User["status"] });
      } catch (e) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError("An unknown error occurred");
        }
      }
      setLoading(false);
    }
    fetchUser();
  }, [userId]);

  if (loading) return <div className="p-6">Loading user...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!user) return null;

  return (
    <EditUserModal
      user={user}
      onClose={onClose}
      onSaved={() => onClose()}
    />
  );
}
