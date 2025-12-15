"use client";
import { HeaderClient } from "./HeaderClient";

export function Header() {
  return (
    <header className="w-full flex items-center bg-primary shadow-md sticky top-0 z-50 px-4 py-3 md:px-8">
      <a href="/" className="flex items-center gap-2">
        <img src="/logo.svg" alt="RentIT Logo" className="h-10 w-auto drop-shadow-lg" style={{maxWidth:'160px'}} />
          <span className="ml-2 px-2 py-0.5 rounded bg-blue-900 text-white text-xs font-bold align-middle select-none" title="Version">v6</span>
      </a>
      <div className="flex-1" />
      <HeaderClient />
    </header>
  );
}