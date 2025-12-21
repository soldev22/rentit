
"use client";
import React, { useState } from "react";
import EditUserModal from "@/app/(auth)/admin/users/edit-user-modal";

export default function ManageUserModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [user, setUser] = useState<any | null>(null);
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
        setUser(data.user);
      } catch (e: any) {
        setError(e.message);
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
