
/**
 * ADMIN BOUNDARY
 * All admin access is enforced here.
 * See AUTH_PATTERN.md before modifying.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireRole } from "@/lib/requireRole";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  requireRole("ADMIN", session);

  return <>{children}</>;
}