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
          <footer className="w-full bg-blue-900 text-white py-6 mt-12 border-t border-blue-800">
            <div className="mx-auto max-w-5xl flex flex-col md:flex-row justify-between items-center px-4 gap-2">
              <div className="text-sm">&copy; {new Date().getFullYear()} RentIT. All rights reserved.</div>
              <div className="flex gap-4 text-sm">
                <a href="/who-we-are" className="hover:underline">About</a>
                <a href="/contact" className="hover:underline">Contact</a>
                <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">Twitter</a>
                <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">Facebook</a>
              </div>
            </div>
          </footer>
        </AppSessionProvider>
      </body>
    </html>
  );
}
