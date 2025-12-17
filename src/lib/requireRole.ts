/**
 * AUTH CRITICAL
 * This file is governed by AUTH_PATTERN.md
 * Do not change role behaviour without updating docs.
 */

import { redirect } from "next/navigation";
import type { AppRole } from "@/types/next-auth";

export function requireRole(
  role: AppRole,
  session: any,
  redirectTo = "/login"
) {
  if (!session || session.user?.role !== role) {
    redirect(redirectTo);
  }
}
