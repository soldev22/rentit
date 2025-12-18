"use client";

import { useMemo, useState } from "react";
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
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 14,
    fontFamily: "Arial, Helvetica, sans-serif",
    marginBottom: 14,
    flexWrap: "wrap",
  }}
>
  {/* Search */}
  <input
    placeholder="Search email or name"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    style={{
      padding: "8px 12px",
      border: "1px solid #cbd5f5",
      borderRadius: "6px",
      minWidth: "260px",
      fontSize: "14px",
      outline: "none",
    }}
  />

  {/* Role filter */}
  <select
    value={roleFilter}
    onChange={(e) => setRoleFilter(e.target.value)}
    style={{
      padding: "8px 10px",
      borderRadius: 6,
      border: "1px solid #cbd5f5",
      fontSize: 14,
    }}
  >
    <option value="ALL">All roles</option>
    <option value="ADMIN">Admin</option>
    <option value="LANDLORD">Landlord</option>
    <option value="TENANT">Tenant</option>
    <option value="APPLICANT">Applicant</option>
    <option value="TRADESPERSON">Tradesperson</option>
  </select>

  {/* Status checkboxes (horizontal) */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      paddingLeft: 8,
      fontSize: 13,
    }}
  >
    {(["ACTIVE", "INVITED", "PAUSED"] as const).map((status) => (
      <label
        key={status}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          cursor: "pointer",
          userSelect: "none",
        }}
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
      <table
        width="100%"
        cellPadding={10}
        style={{
          borderCollapse: "collapse",
          backgroundColor: "#ffffff",
          marginTop: "20px",
        }}
      >
        <thead
          style={{
            backgroundColor: "rgba(52, 96, 238, 1)",
            color: "#ffffff",
            paddingLeft:"10px"
          }}
        >
          <tr>
            <th
  align="left"
  style={{
    paddingLeft: "10px",
  }}
>
  Name
</th>
            <th align="left">Email</th>
            <th align="left">Role</th>
            <th align="left">Status</th>
            <th align="left">Created</th>
            <th align="left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredUsers.map((u, index) => (
            <tr
              key={u._id}
              style={{
                backgroundColor:
                  index % 2 === 0
                    ? "rgba(214, 214, 249, 1)"
                    : "#f0e8e8ff",
              }}
            >
              <td
  style={{
    paddingLeft: "10px",
  }}
>
  {u.name || "—"}
</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.status ?? "ACTIVE"}</td>
              <td>
                {u.createdAt
                  ? new Date(u.createdAt).toLocaleDateString()
                  : "-"}
              </td>
              <td>
                <button
                  onClick={() => setSelectedUser(u)}
                  style={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
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
