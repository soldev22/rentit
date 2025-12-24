import React from "react";

interface SimplePageLayoutProps {
  children: React.ReactNode;
}

export default function SimplePageLayout({
  children,
}: SimplePageLayoutProps) {
  return (
    <div className="p-6 font-sans max-w-md mx-auto">
      {children}
    </div>
  );
}
