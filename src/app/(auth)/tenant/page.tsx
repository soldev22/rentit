// src/app/tenant/page.tsx
import { redirect } from "next/navigation";

export default function TenantIndex() {
  redirect("/tenant/dashboard");
}
