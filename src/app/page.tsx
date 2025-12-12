export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="flex flex-col items-center gap-8 p-8 bg-white dark:bg-zinc-900 rounded shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2 text-center">Welcome to RentIT</h1>
        <p className="text-zinc-600 dark:text-zinc-300 text-center mb-4">Sign in or create an account to get started.</p>
        <div className="flex gap-4 w-full justify-center">
          <a href="/login" className="w-32 py-2 rounded bg-blue-600 text-white text-center font-semibold hover:bg-blue-700 transition">Login</a>
          <a href="/register" className="w-32 py-2 rounded bg-gray-200 text-blue-700 text-center font-semibold hover:bg-gray-300 transition">Register</a>
        </div>
      </div>
    </main>
  );
}
