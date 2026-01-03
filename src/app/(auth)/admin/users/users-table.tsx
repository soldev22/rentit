"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateShort } from "@/lib/formatDate";
import EditUserModal from "./edit-user-modal";

type User = {
  _id: string;
  email: string;
  name?: string;
  role: "ADMIN" | "LANDLORD" | "TENANT" | "APPLICANT" | "TRADESPERSON";
  status: "ACTIVE" | "INVITED" | "PAUSED";
  createdAt?: string;
};

export default function UsersTable({ users }: { users: User[] }) {
  // Normalise incoming users
  const normalisedUsers = useMemo(
    () =>
      users.map((u) => ({
        ...u,
        status: u.status ?? "ACTIVE",
      })),
    [users]
  );

  const [usersState, setUsersState] = useState<User[]>(normalisedUsers);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [statusFilters, setStatusFilters] = useState({
    ACTIVE: true,
    INVITED: true,
    PAUSED: false,
  });

  // Keep state in sync if server data changes
  useEffect(() => {
    setUsersState(normalisedUsers);
  }, [normalisedUsers]);

  const filteredUsers = useMemo(() => {
    return usersState.filter((u) => {
      const matchesRole =
        roleFilter === "ALL" || u.role === roleFilter;

      const matchesStatus =
        statusFilters[u.status];

      const matchesSearch =
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.name?.toLowerCase().includes(search.toLowerCase()) ?? false);

      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [usersState, roleFilter, statusFilters, search]);

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-3.5 font-sans mb-3.5 flex-wrap">
        <input
          placeholder="Search email or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-blue-200 rounded-md min-w-[260px] text-sm focus:outline-none"
        />

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-2.5 py-2 rounded-md border border-blue-200 text-sm"
          aria-label="Filter by role"
        >
          <option value="ALL">All roles</option>
          <option value="ADMIN">Admin</option>
          <option value="LANDLORD">Landlord</option>
          <option value="TENANT">Tenant</option>
          <option value="APPLICANT">Applicant</option>
          <option value="TRADESPERSON">Tradesperson</option>
        </select>

        <div className="flex items-center gap-3 pl-2 text-xs">
          {(["ACTIVE", "INVITED", "PAUSED"] as const).map((status) => (
            <label
              key={status}
              className="flex items-center gap-1 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={statusFilters[status]}
                onChange={() =>
                  setStatusFilters((prev) => ({
                    ...prev,
                    [status]: !prev[status],
                  }))
                }
              />
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </label>
          ))}
        </div>

        <div className="text-sm font-semibold">
          Showing {filteredUsers.length} of {usersState.length}
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse bg-white mt-5">
        <thead className="bg-blue-700 text-white">
          <tr>
            <th className="text-left pl-2.5">Name</th>
            <th className="text-left">Email</th>
            <th className="text-left">Role</th>
            <th className="text-left">Status</th>
            <th className="text-left">Created</th>
            <th className="text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredUsers.map((u, index) => (
            <tr
              key={u._id}
              className={index % 2 === 0 ? "bg-blue-100" : "bg-red-50"}
            >
              <td className="pl-2.5">{u.name || "—"}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.status}</td>
              <td>{u.createdAt ? formatDateShort(u.createdAt) : "-"}</td>
              <td>
                <button
                  onClick={() => {
                    // Defensive logging for debugging
                    console.log('[USERS TABLE] Edit clicked for user:', u);
                    // Defensive check: ensure required fields exist
                    if (!u || !u._id || !u.email || !u.role) {
                      alert('User data is incomplete or invalid. Cannot open editor.');
                      return;
                    }
                    setSelectedUser(u);
                  }}
                  className="bg-blue-600 text-white border-none px-3 py-1.5 rounded cursor-pointer text-xs"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal — SAFE */}
      {selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSaved={(updated) => {
            setUsersState((prev) =>
              prev.map((u) =>
                u._id === updated._id
                  ? {
                      ...u,
                      role: updated.role as User["role"],
                      status: updated.status as User["status"],
                    }
                  : u
              )
            );
          }}
        />
      )}
    </>
  );
}
