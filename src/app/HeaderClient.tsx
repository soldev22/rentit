"use client";
import { useSession, signOut } from "next-auth/react";

export function HeaderClient() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if (!session?.user?.name) {
    return (
      <button
        onClick={() => window.location.href = "/api/auth/signin"}
        className="ml-auto px-3 py-1 rounded bg-white/20 hover:bg-white/40 text-white font-semibold text-sm transition border border-white/30"
        title="Sign in"
      >
        Sign in
      </button>
    );
  }
  return (
    <div className="flex items-center gap-3 ml-auto">
      <span className="hidden sm:inline text-white font-semibold text-base md:text-lg truncate max-w-xs" title={session.user.name}>
        {session.user.name}
      </span>
      {session.user.role && (
        <span
          className="inline-block px-2 py-0.5 rounded bg-white/20 text-xs font-bold uppercase tracking-wide text-white border border-white/30"
          title={session.user.role}
        >
          {session.user.role}
        </span>
      )}
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="px-3 py-1 rounded bg-white/20 hover:bg-white/40 text-white font-semibold text-sm transition border border-white/30"
        title="Logout"
      >
        Logout
      </button>
    </div>
  );
}
