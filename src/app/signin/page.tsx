// This file has been removed to revert to the default NextAuth sign-in page.
import { getCsrfToken, getProviders } from "next-auth/react";
import Link from "next/link";

export default async function SignInPage() {
  const csrfToken = await getCsrfToken();
  const providers = await getProviders();

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Sign in to RentIT</h1>
        <form method="post" action="/api/auth/callback/credentials" className="space-y-4">
          <input name="csrfToken" type="hidden" defaultValue={csrfToken ?? ''} />
          <label className="block">
            Email
            <input name="email" type="email" className="mt-1 w-full p-2 border rounded" required />
          </label>
          <label className="block">
            Password
            <input name="password" type="password" className="mt-1 w-full p-2 border rounded" required minLength={6} />
          </label>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">Sign in</button>
        </form>
        <div className="mt-4 text-center">
          <Link href="/password-reset/request" className="text-blue-600 underline text-sm hover:text-blue-800">Forgot password?</Link>
        </div>
        <div className="mt-6">
          <hr className="mb-4" />
          <div className="text-center text-sm text-gray-500 mb-2">Or sign in with</div>
          {providers && Object.values(providers).filter(p => p.id !== 'credentials').map(provider => (
            <form key={provider.id} method="post" action={`/api/auth/signin/${provider.id}`}
              className="mb-2">
              <input type="hidden" name="csrfToken" value={csrfToken ?? ''} />
              <button type="submit" className="w-full bg-gray-100 border border-gray-300 py-2 rounded hover:bg-gray-200">
                {provider.name}
              </button>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}
