"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TenancyApplicationWorkflow from './TenancyApplicationWorkflow';

export default function ApplyButton({
  propertyId,
  propertyTitle,
  isApplied,
}: {
  propertyId: string;
  propertyTitle?: string;
  isApplied?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showApplicationWorkflow, setShowApplicationWorkflow] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('apply') === '1';
  });

  useEffect(() => {
    // determine auth state and current user on mount
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (!mounted) return;
        if (res.ok) {
          await res.json();
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        if (!mounted) return;
        setIsAuthenticated(false);
      }
    })();
    return () => { mounted = false };
  }, []);


  useEffect(() => {
    // If we returned from sign-in with ?apply=1, clean the URL.
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('apply') !== '1') return;
    params.delete('apply');
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash || ''}`;
    window.history.replaceState({}, '', next);
  }, []);

  async function handleApplyClick() {
    if (isApplied) return;

    // If user isn't authenticated, send them to sign-in and come back with apply=1
    if (isAuthenticated === false) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('apply', '1');
      const callbackUrl = encodeURIComponent(currentUrl.toString());
      window.location.href = `/api/auth/signin?callbackUrl=${callbackUrl}`;
      return;
    }

    // Show the tenancy application workflow
    setShowApplicationWorkflow(true);
  }

  return (
    <div>
      {isApplied ? (
        <div className="mb-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          You have already applied for this property.
          <div className="mt-1">
            <Link href="/applicant/dashboard" className="font-semibold text-green-800 underline hover:text-green-900">
              View your application in the dashboard
            </Link>
          </div>
        </div>
      ) : null}

      <button
        onClick={handleApplyClick}
        disabled={Boolean(isApplied)}
        className={
          isApplied
            ? "w-full inline-block text-center rounded-md px-4 py-2 font-semibold bg-gray-200 text-gray-500 cursor-not-allowed"
            : "w-full inline-block text-center rounded-md px-4 py-2 font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
        }
      >
        {isAuthenticated
          ? (isApplied ? 'Already applied' : 'Arrange a viewing')
          : 'Sign in or register to arrange a viewing'}
      </button>
      {message && <div className="mt-2 text-sm text-gray-700">{message}</div>}

      {showApplicationWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <TenancyApplicationWorkflow
              propertyId={propertyId}
              propertyTitle={propertyTitle}
              onComplete={() => {
                setShowApplicationWorkflow(false);
                setMessage(
                  "Thank you. The landlord will get back to you to confirm the viewing."
                );

                // Refresh the page the user started from (e.g. property detail/list)
                // so server-rendered application status updates immediately.
                router.refresh();
              }}
              onCancel={() => setShowApplicationWorkflow(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
