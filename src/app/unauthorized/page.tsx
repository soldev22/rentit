export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="p-8 bg-white rounded shadow text-center">
        <h1 className="text-2xl font-bold mb-2">Unauthorized</h1>
        <p className="mb-4">You do not have permission to access this page.</p>
        <a href="/dashboard" className="text-blue-600 underline">Go to Dashboard</a>
      </div>
    </main>
  );
}
