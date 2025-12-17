"use client";

import { signIn, signOut, useSession } from "next-auth/react";


export default function HeaderClient() {
  const { data: session, status } = useSession();

  const isProd = process.env.NODE_ENV === "production";
  const gitSha = process.env.NEXT_PUBLIC_GIT_SHA;
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION;
const isBrowser = typeof window !== "undefined";

if (!isBrowser) {
  return null;
}

  let versionLabel = "dev";

  if (isProd && appVersion) {
    versionLabel = `v${appVersion}`;
  } else if (gitSha) {
    versionLabel = `dev • ${gitSha.slice(0, 7)}`;
  } else {
    versionLabel = "dev • local";
  }

  return (
    <div className="flex items-center gap-3 ml-auto">
      {/* While loading, show nothing */}
      {status === "loading" && null}

      {/* Logged out */}
      {status === "unauthenticated" && (
        <button
          onClick={() => signIn()}
          className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20"
        >
          Sign in
        </button>
      )}

      {/* Logged in */}
      {status === "authenticated" && session?.user && (
        <>
          {/* Version badge */}
          <span
            className="ml-3 text-xs font-mono text-white/60"
            title="Application version"
          >
            {versionLabel}
          </span>

          {/* User name */}
          {session.user.name && (
            <span
              className="hidden sm:inline truncate max-w-xs text-white font-semibold text-base md:text-lg"
              title={session.user.name}
            >
              {session.user.name}
            </span>
          )}

          {/* Role badge */}
          {session.user.role && (
            <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white">
              {session.user.role}
            </span>
          )}

          {/* Sign out */}
          <button
            onClick={() =>
              signOut({
                callbackUrl: "/login",
              })
            }
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20"
          >
            Sign out
          </button>
        </>
      )}
    </div>
  );
}
