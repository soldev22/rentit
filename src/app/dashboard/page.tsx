
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login?next=/dashboard");
  }
  // @ts-ignore
  const role = session.user?.role;
  if (role === "ADMIN") {
    redirect("/admin");
  } else if (role === "LANDLORD") {
    redirect("/landlord");
  } else if (role === "RENTER") {
    redirect("/renter");
  } else {
    return <div>Unknown role</div>;
  }
  return null;
}
