"use client";

import { useEffect, useState } from "react";
import TenancyApplicationWorkflow from './TenancyApplicationWorkflow';

export default function ApplyButton({ propertyId, propertyTitle, interests = [] }: { propertyId: string; propertyTitle?: string; interests?: any[] }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showApplicationWorkflow, setShowApplicationWorkflow] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // determine auth state and current user on mount
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (!mounted) return;
        if (res.ok) {
          const session = await res.json();
          setCurrentUser(session?.user || null);
          setIsAuthenticated(true);
        } else {
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      } catch (_err) {
        if (!mounted) return;
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  // Check if current user has already applied
  const hasAlreadyApplied = () => {
    if (!currentUser) return false;
    return interests.some((interest: any) => {
      return interest.applicantId === currentUser.id || 
             (interest.applicantEmail && interest.applicantEmail.toLowerCase() === currentUser.email?.toLowerCase());
    });
  };

  async function handleApplyClick() {
    if (hasAlreadyApplied()) {
      return; // Don't allow re-application
    }

    // Show the tenancy application workflow
    setShowApplicationWorkflow(true);
  }

  const alreadyApplied = hasAlreadyApplied();

  return (
    <div>
      <button
        onClick={handleApplyClick}
        disabled={loading || alreadyApplied}
        className={`w-full inline-block text-center rounded-md px-4 py-2 font-semibold ${
          loading || alreadyApplied 
            ? 'bg-gray-400 text-white cursor-not-allowed' 
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}>
        {loading 
          ? 'Applying…' 
          : alreadyApplied 
            ? 'Already Applied' 
            : isAuthenticated 
              ? 'Apply for this property' 
              : 'Sign in or register to apply'
        }
      </button>
      {message && <div className="mt-2 text-sm text-gray-700">{message}</div>}
      {alreadyApplied && !message && (
        <div className="mt-2 text-sm text-green-600">You&apos;ve already registered interest for this property.</div>
      )}

      {showApplicationWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <TenancyApplicationWorkflow
              propertyId={propertyId}
              propertyTitle={propertyTitle}
              onComplete={() => {
                setShowApplicationWorkflow(false);
                setMessage("Tenancy application started successfully!");
              }}
              onCancel={() => setShowApplicationWorkflow(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
