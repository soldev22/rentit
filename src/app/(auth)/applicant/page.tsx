import Link from "next/link";

export default function ApplicantPage() {
  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6 space-y-6">
      <h1 className="text-xl font-semibold mb-4">Applicant Dashboard</h1>
      <div>
        <Link
          href="/applicant/properties"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 active:bg-indigo-700"
        >
          View Listed Properties
        </Link>
      </div>
    </main>
  );
}