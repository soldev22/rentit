import "./globals.css";
import {AppSessionProvider} from "@/app/AppSessionProvider";
import HeaderClient from "@/app/HeaderClient";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppSessionProvider>
          <HeaderClient />
          <main className="min-h-screen w-full">
            {children}
          </main>
        </AppSessionProvider>
      </body>
    </html>
  );
}
