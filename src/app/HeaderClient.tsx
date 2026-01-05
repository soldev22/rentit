"use client";

import { useState } from 'react';
import Image from "next/image";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function HeaderClient() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <header className="w-full border-b border-blue-600 bg-blue-600 px-4 py-3 text-white">
      <div className="flex items-center justify-between">
        {/* Logo on the left */}
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <Image
            src="/Logox.png"
            alt="Rentsimple Logo"
            width={40}
            height={40}
            className="mr-3"
            priority
          />
          <span className="text-lg font-semibold tracking-tight">
            Rentsimple <span className="text-xs">V2.0</span>
          </span>
        </Link>

        {/* Mobile menu button */}
        <button
          className="md:hidden ml-4 p-2 rounded-md hover:bg-white/10"
          aria-label="Toggle menu"
          onClick={() => setShowMobileMenu((s) => !s)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Navigation links */}
        <nav className="hidden md:flex gap-6 ml-8">
          <Link href="/" className="hover:underline font-medium">Home</Link>
          {/* <Link href="/public/properties" className="hover:underline font-medium">Properties</Link> */}
          <Link href="/who-we-are" className="hover:underline font-medium">Who We Are</Link>
          <Link href="/contact" className="hover:underline font-medium">Contact</Link>
        </nav>
        {/* Right side (hidden on small, use mobile menu) */}
        <div className="hidden sm:flex items-center gap-3">
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

    {/* Dashboard link based on role */}
    {session.user.role && (
      <a
        href={
          session.user.role === 'LANDLORD' ? '/landlord/dashboard' :
          session.user.role === 'TENANT' ? '/tenant' :
          session.user.role === 'AGENT' ? '/agent/dashboard' :
          session.user.role === 'ADMIN' ? '/admin' :
          session.user.role === 'APPLICANT' ? '/applicant' :
          session.user.role === 'TRADESPERSON' ? '/tradesperson' :
          session.user.role === 'ACCOUNTANT' ? '/accountant' :
          '/dashboard'
        }
        className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
      >
        Dashboard
      </a>
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

      {/* Mobile dropdown */}
      {showMobileMenu && (
        <div className="md:hidden bg-blue-600 border-t border-blue-700">
          <div className="px-4 py-3 flex flex-col gap-3">
            <Link href="/" className="hover:underline font-medium">Home</Link>
            {/* <Link href="/public/properties" className="hover:underline font-medium">Properties</Link> */}
            <Link href="/who-we-are" className="hover:underline font-medium">Who We Are</Link>
            <Link href="/contact" className="hover:underline font-medium">Contact</Link>
            <div className="pt-2 border-t border-blue-700"></div>
            {status === 'unauthenticated' && pathname !== '/login' && (
              <button
                onClick={() => signIn(undefined, { callbackUrl: '/dashboard' })}
                className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
              >
                Sign in
              </button>
            )}
            {status === 'authenticated' && (
              <>
                {session?.user?.role && (
                  <a 
                    href={
                      session.user.role === 'LANDLORD' ? '/landlord/dashboard' :
                      session.user.role === 'TENANT' ? '/tenant' :
                      session.user.role === 'AGENT' ? '/agent/dashboard' :
                      session.user.role === 'ADMIN' ? '/admin' :
                      session.user.role === 'APPLICANT' ? '/applicant' :
                      session.user.role === 'TRADESPERSON' ? '/tradesperson' :
                      session.user.role === 'ACCOUNTANT' ? '/accountant' :
                      '/dashboard'
                    }
                    className="hover:underline font-medium"
                  >
                    Dashboard
                  </a>
                )}
                <a href="/profile" className="hover:underline font-medium">My profile</a>
                <button onClick={() => signOut({ callbackUrl: '/login' })} className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20">Sign out</button>
              </>
            )}
          </div>
        </div>
      )}

    </header>
  );
}
