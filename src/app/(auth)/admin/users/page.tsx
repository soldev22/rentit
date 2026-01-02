import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getCollection } from "@/lib/db";
import UsersTable from "@/app/(auth)/admin/users/users-table";
import Link from "next/link";


export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    console.log("[ADMIN USERS] Unauthorized access or missing session", { session });
    redirect("/unauthorized");
  }

  const usersCollection = await getCollection("users");

  type RawUser = {
    _id?: unknown;
    name?: string;
    email?: string;
    role?: string;
    status?: string;
    createdAt?: Date | null;
  };

  let users: RawUser[] = [];
  try {
    users = await usersCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(5000) // sane cap for now
      .toArray();
    console.log("[ADMIN USERS] Fetched users:", users.map(u => ({ _id: u._id, name: u.name, email: u.email, role: u.role })));
  } catch (err) {
    console.error("[ADMIN USERS] Error fetching users:", err);
  }

  const safeUsers = Array.isArray(users)
    ? users.map((u) => ({
        _id: u?._id?.toString?.() ?? "",
        name: u?.name ?? "",
        email: u?.email ?? "",
        role: u?.role ?? "",
        status: (["ACTIVE", "PAUSED", "INVITED"].includes(u?.status ?? "") ? u?.status : "ACTIVE") as "ACTIVE" | "PAUSED" | "INVITED",
        createdAt: u?.createdAt ? u.createdAt.toISOString() : undefined,
      }))
    : [];


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


      {safeUsers.length > 0 ? (
        <UsersTable users={safeUsers} />
      ) : (
        <div className="text-center text-gray-500 py-8">No users found or failed to load users.</div>
      )}
    </div>
  );
}
