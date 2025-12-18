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
    const token = params.get("token");
    if (!token) {
      setStatus("Missing magic link token.");
      return;
    }
    fetch("/api/auth/magic-link/consume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Invalid or expired link");
        const data = await res.json();
        // Now sign in with NextAuth credentials provider, magic mode
        await signIn("credentials", {
          email: data.email,
          magic: true,
          redirect: false
        });
        router.replace("/dashboard");
      })
      .catch(() => {
        setStatus("Invalid or expired magic link.");
      });
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
