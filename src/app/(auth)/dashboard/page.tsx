// src/app/dashboard/page.tsx
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session || !session.user?.role) {
      router.replace("/login");
      return;
    }

    switch (session.user.role) {
      case "AGENT":
        router.replace("/agent/dashboard");
        break;
      case "LANDLORD":
        router.replace("/landlord/dashboard");
        break;
      case "TENANT":
        router.replace("/tenant");
        break;
      case "ADMIN":
        router.replace("/admin");
        break;
      case "APPLICANT":
        router.replace("/applicant");
        break;
      case "TRADESPERSON":
        router.replace("/tradesperson");
        break;
      case "ACCOUNTANT":
        router.replace("/accountant");
        break;
      default:
        router.replace("/login");
    }
  }, [session, status, router]);

  return (
    <div className="p-6">
      Redirecting to your dashboard…
    </div>
  );
}
