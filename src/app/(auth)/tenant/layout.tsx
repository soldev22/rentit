// src/app/tenant/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function TenantLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  if (session.user.role !== "TENANT") {
    redirect("/dashboard");
  }

  if (session.user.status !== "ACTIVE") {
    redirect("/account-paused");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {children}
    </div>
  );
}
