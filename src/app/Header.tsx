"use client";
import { HeaderClient } from "./HeaderClient";

export function Header() {
  return (
    <header className="w-full flex items-center bg-primary shadow-md sticky top-0 z-50 px-4 py-3 md:px-8">
      <a href="/" className="flex items-center gap-2">
        <img src="/logo.svg" alt="RentIT Logo" className="h-10 w-auto drop-shadow-lg" style={{maxWidth:'160px'}} />
      </a>
      <div className="flex-1" />
      <HeaderClient />
    </header>
  );
}