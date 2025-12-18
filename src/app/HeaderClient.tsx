"use client";

import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function HeaderClient() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  return (
    <header className="w-full border-b border-blue-600 bg-blue-600 px-4 py-3 text-white">
      <div className="flex items-center justify-between">
        {/* Logo on the left */}
        <div className="flex items-center">
          <Image
            src="/image.png"
            alt="RentIT Logo"
            width={40}
            height={40}
            className="mr-3"
            priority
          />
          <span className="text-lg font-semibold tracking-tight">
            RentIT
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {status === "loading" && (
            <span className="text-sm text-blue-200">
              Loading…
            </span>
          )}

          {status === "unauthenticated" && pathname !== "/login" && (
            <button
              onClick={() =>
                signIn(undefined, {
                  callbackUrl: "/dashboard",
                })
              }
              className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
            >
              Sign in
            </button>
          )}

{status === "authenticated" && session?.user && (
  <>
    {/* Name (not email) */}
    {session.user.name && (
      <span
        className="hidden sm:inline truncate max-w-xs font-semibold"
        title={session.user.name}
      >
        {session.user.name}
      </span>
    )}

    {/* Role badge */}
    {session.user.role && (
      <span className="rounded-md bg-white/20 px-2 py-1 text-xs font-semibold uppercase tracking-wide">
        {session.user.role}
      </span>
    )}

    {/* My profile link */}
    <a
      href="/profile"
      className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
    >
      My profile
    </a>

    <button
      onClick={() =>
        signOut({
          callbackUrl: "/login",
        })
      }
      className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
    >
      Sign out
    </button>
  </>
)}

        </div>
      </div>
    </header>
  );
}
