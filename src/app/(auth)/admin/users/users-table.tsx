"use client";

import { useMemo, useState } from "react";
import { formatDateShort } from "@/lib/formatDate";
import EditUserModal from "./edit-user-modal";

type User = {
  _id: string;
  email: string;
  name?: string;
  role: string;
  status: "ACTIVE" | "INVITED" | "PAUSED";
  createdAt?: string;
};

export default function UsersTable({ users }: { users: User[] }) {
  // Ensure all users have a valid status
  const normalizedUsers = users.map((u) => ({
    ...u,
    status: u.status ?? "ACTIVE",
  }));
  const [usersState, setUsers] = useState<User[]>(normalizedUsers);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
const [statusFilters, setStatusFilters] = useState({
  ACTIVE: true,
  INVITED: true,
  PAUSED: false,
});



const filteredUsers = useMemo(() => {
  return usersState.filter((u) => {
    const matchesRole =
      roleFilter === "ALL" || u.role === roleFilter;

    const matchesStatus =
      statusFilters[u.status as keyof typeof statusFilters];

    const matchesSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name?.toLowerCase().includes(search.toLowerCase()) ?? false);

    return matchesRole && matchesStatus && matchesSearch;
  });
}, [usersState, roleFilter, statusFilters, search]);

  return (
    <>
      {/* Filters */}
{/* Filters */}
<div className="flex items-center gap-3.5 font-sans mb-3.5 flex-wrap">
  {/* Search */}
  <input
    placeholder="Search email or name"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="px-3 py-2 border border-blue-200 rounded-md min-w-[260px] text-sm focus:outline-none"
  />

  {/* Role filter */}
  <label htmlFor="roleFilter" className="sr-only">
    Filter by role
  </label>
  <select
    id="roleFilter"
    aria-label="Filter by role"
    value={roleFilter}
    onChange={(e) => setRoleFilter(e.target.value)}
    className="px-2.5 py-2 rounded-md border border-blue-200 text-sm"
  >
    <option value="ALL">All roles</option>
    <option value="ADMIN">Admin</option>
    <option value="LANDLORD">Landlord</option>
    <option value="TENANT">Tenant</option>
    <option value="APPLICANT">Applicant</option>
    <option value="TRADESPERSON">Tradesperson</option>
  </select>

  {/* Status checkboxes (horizontal) */}
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
  ||  <h1><b>Showing {filteredUsers.length} of {usersState.length}</b></h1>
  {/* Count */}
 
</div>


      {/* Table */}
      <table className="w-full border-collapse bg-white mt-5">
        <thead className="bg-blue-700 text-white pl-2.5">
          <tr>
            <th className="text-left pl-2.5">
  Name
</th>
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
              <td className="pl-2.5">
  {u.name || "—"}
</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.status ?? "ACTIVE"}</td>
              <td>
                {u.createdAt
                  ? formatDateShort(u.createdAt)
                  : "-"}
              </td>
              <td>
                <button
                  onClick={() => setSelectedUser(u)}
                  className="bg-blue-600 text-white border-none px-3 py-1.5 rounded cursor-pointer text-xs"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSaved={(updated) => {
  setUsers((prev) =>
    prev.map((u) =>
      u._id === updated._id
        ? { ...u, role: updated.role, status: updated.status }
        : u
    )
  );
}}

        />
      )}
    </>
  );
}
