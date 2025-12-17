// filepath: src/app/dashboard/page.tsx
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Debug: Log session for troubleshooting (remove after fixing)
 
  if (!session || !session.user?.role) {
    redirect("/login");  // Use your login page, not NextAuth internal
  }

  switch (session.user.role) {
    case "AGENT":
      redirect("/agent/dashboard");
    case "LANDLORD":
      redirect("/landlord/dashboard");
    case "TENANT":
      redirect("/tenant");
    case "ADMIN":
      redirect("/admin");
    case "APPLICANT":
      redirect("/applicant");
    case "TRADESPERSON":
      redirect("/tradesperson");
    case "ACCOUNTANT":
      redirect("/accountant");
    default:
      redirect("/login");
  }
}