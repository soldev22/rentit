import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
// Import getPrimaryRole only; import Role type from types/next-auth.d.ts or define it here if needed
import { getPrimaryRole } from "@/lib/roles";
// Define Role type here since it's not exported from types/next-auth
type Role = "LANDLORD" | "TENANT" | "ADMIN" | "APPLICANT" | "TRADESPERSON" | "ACCOUNTANT";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    redirect("/api/auth/signin?next=/dashboard");
  }

  const role = (await getPrimaryRole(session.user.id)) as Role | null;

  if (!role) {
    return <div>Unknown role</div>;
  }

  switch (role) {
    case "LANDLORD":
      redirect("/landlord");
      break;
    case "TENANT":
      redirect("/tenant");
      break;
    case "ADMIN":
      redirect("/admin");
      break;
    case "APPLICANT":
      redirect("/applicant");
      break;
    case "TRADESPERSON":
      redirect("/tradesperson");
      break;
    case "ACCOUNTANT":
      redirect("/accountant");
      break;
    default:
      return <div>Unknown role</div>;
  }

  return <div>Unknown role</div>;
}
