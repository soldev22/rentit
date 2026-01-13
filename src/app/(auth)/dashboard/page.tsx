"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Only redirect to login if NextAuth has confirmed you're NOT signed in
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    // If authenticated but role isn't there yet, just wait.
    // This avoids the bounce-back loop you’re seeing.
    const role = session?.user?.role;
    if (status !== "authenticated" || !role) return;

    switch (role) {
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
        router.replace("/applicant/dashboard");
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
      <h1 className="text-lg font-semibold">Signing you in…</h1>
      <p className="mt-2 text-sm text-gray-600">
        {status === "loading" && "Loading session…"}
        {status === "authenticated" && !session?.user?.role && "Loading your profile…"}
        {status === "authenticated" && session?.user?.role && "Redirecting…"}
        {status === "unauthenticated" && "Redirecting to login…"}
      </p>
    </div>
  );
}
