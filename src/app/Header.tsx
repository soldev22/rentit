import HeaderClient from "./HeaderClient";

export function Header() {
  return (
    <header className="flex items-center px-4 py-3 bg-black border-b border-white/10">
      <div className="text-white font-semibold text-lg">
        Rentsimple
      </div>
Commit: {process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)}

      {/* Client-side auth / user controls */}
      <HeaderClient />
    </header>
  );
}
