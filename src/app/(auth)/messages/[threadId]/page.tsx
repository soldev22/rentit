import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ThreadClient from "@/app/(auth)/messages/thread-client";

export default async function MessageThreadPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent("/messages")}`);
  }

  return <ThreadClient />;
}
