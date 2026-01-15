import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import MessagesHomeClient from "@/app/(auth)/messages/messages-home-client";

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent("/messages")}`);
  }

  return <MessagesHomeClient />;
}
