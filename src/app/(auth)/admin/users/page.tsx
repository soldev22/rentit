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
    <div className="p-6">
    <div className="bg-slate-50 p-4 px-6 mb-4 border-b border-gray-200 flex items-center justify-between">
  {/* Left: badge */}
  <span className="inline-block bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold tracking-wide font-sans">
    User Management
  </span>

  {/* Right: invite link */}
 <div className="flex gap-3">


  <Link
    href="/admin/users/invite"
    className="bg-blue-600 text-white px-3.5 py-2 rounded-md no-underline text-sm font-medium font-sans"
  >
    Invite user
  </Link>
</div>

</div>


      <UsersTable users={safeUsers} />
    </div>
  );
}
