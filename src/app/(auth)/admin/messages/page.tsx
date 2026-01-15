import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import AdminMessagesClient from "@/app/(auth)/admin/messages/admin-messages-client";

export default async function AdminMessagesPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/unauthorized");
  }

  return <AdminMessagesClient />;
}
