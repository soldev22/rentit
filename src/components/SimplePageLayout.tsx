import React from "react";

interface SimplePageLayoutProps {
  children: React.ReactNode;
  maxWidth?: number | string;
  padding?: number | string;
  fontFamily?: string;
}

export default function SimplePageLayout({
  children,
  maxWidth = 520,
  padding = 24,
  fontFamily = "Arial, Helvetica, sans-serif",
}: SimplePageLayoutProps) {
  return (
    <div
      style={{
        padding,
        fontFamily,
        maxWidth,
        margin: "0 auto",
      }}
    >
      {children}
    </div>
  );
}
