import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireRole } from "@/lib/requireRole";

export default async function AdminUsersPage() {
  

  return (
    <div>
      <h1 className="text-xl font-semibold">Users</h1>
    </div>
  );
}
