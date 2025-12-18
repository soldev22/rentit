import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getCollection } from "@/lib/db";
import UsersTable from ".././/users/users-table"
import Link from "next/link";


export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/unauthorized");
  }

  const usersCollection = await getCollection("users");

  const users = await usersCollection
    .find({})
    .sort({ createdAt: -1 })
    .limit(5000) // sane cap for now
    .toArray();

  const safeUsers = users.map((u) => ({
  _id: u._id.toString(),
  name: u.name ?? "",
  email: u.email ?? "",
  role: u.role ?? "",
  status: u.status ?? "ACTIVE",
  createdAt: u.createdAt ?? null,
}));


  return (
    <div style={{ padding: 24 }}>
    <div
  style={{
    backgroundColor: "#f8fafc",
    padding: "16px 24px",
    marginBottom: 16,
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  }}
>
  {/* Left: badge */}
  <span
    style={{
      display: "inline-block",
      backgroundColor: "rgba(71, 113, 251, 1)", // keep your chosen colour
      color: "#ffffff",
      padding: "6px 12px",
      borderRadius: "999px",
      fontSize: "14px",
      fontWeight: 600,
      letterSpacing: "0.3px",
      fontFamily: "Arial, Helvetica, sans-serif",
    }}
  >
    User Management
  </span>

  {/* Right: invite link */}
 <div style={{ display: "flex", gap: 12 }}>


  <Link
    href="/admin/users/invite"
    style={{
      backgroundColor: "rgba(71, 113, 251, 1)",
      color: "#ffffff",
      padding: "8px 14px",
      borderRadius: "6px",
      textDecoration: "none",
      fontSize: "14px",
      fontWeight: 500,
      fontFamily: "Arial, Helvetica, sans-serif",
    }}
  >
    Invite user
  </Link>
</div>

</div>


      <UsersTable users={safeUsers} />
    </div>
  );
}
