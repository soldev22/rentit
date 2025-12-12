
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function RenterPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login?next=/renter");
  }
  // @ts-ignore
  if (session.user?.role !== "RENTER") {
    redirect("/unauthorized");
  }
  return <div className="p-8">Welcome, {session.user?.name || "Renter"}!</div>;
}
