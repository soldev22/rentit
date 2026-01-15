"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";


import { Suspense } from "react";

function MagicLinkCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState("Verifying magic link...");

  useEffect(() => {
    const verifyToken = async () => {
      const token = params.get("token");
      if (!token) {
        setStatus("Missing magic link token.");
        return;
      }

      try {
        const result = await signIn("credentials", {
          token,
          magic: "true",
          redirect: false,
        });

        if (!result || result.error) throw new Error("Invalid or expired link");
        router.replace("/");
      } catch {
        setStatus("Invalid or expired magic link.");
      }
    };

    verifyToken();
  }, [params, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="p-6 bg-white rounded shadow text-center">
        <h1 className="text-xl font-bold mb-2">Magic Link Sign In</h1>
        <div>{status}</div>
      </div>
    </main>
  );
}

export default function MagicLinkCallbackPage() {
  return (
    <Suspense>
      <MagicLinkCallbackInner />
    </Suspense>
  );
}
