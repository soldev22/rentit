
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login?next=/admin");
  }
  // @ts-ignore
  if (session.user?.role !== "ADMIN") {
    redirect("/unauthorized");
  }
  return <div className="p-8">Welcome, {session.user?.name || "Admin"}!</div>;
}
