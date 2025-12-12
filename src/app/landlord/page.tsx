
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function LandlordPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login?next=/landlord");
  }
  // @ts-ignore
  if (session.user?.role !== "LANDLORD") {
    redirect("/unauthorized");
  }
  return <div className="p-8">Welcome, {session.user?.name || "Landlord"}!</div>;
}
