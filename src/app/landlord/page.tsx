
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { getPrimaryRole } from "@/lib/roles";

export default async function LandlordPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    redirect("/api/auth/signin?next=/landlord");
  }
  const role = await getPrimaryRole(session.user.id);
  if (role !== "LANDLORD") {
    redirect("/unauthorized");
  }
  return <h1>Landlord Dashboard</h1>;
}
