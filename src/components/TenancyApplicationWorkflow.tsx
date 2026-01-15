"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { TenancyApplication } from '@/lib/tenancy-application';
import { TENANCY_APPLICATION_STAGE_LABELS } from '@/lib/tenancyApplicationStages';

interface TenancyApplicationWorkflowProps {
  propertyId: string;
  propertyTitle?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

export default function TenancyApplicationWorkflow({
  propertyId,
  propertyTitle,
  onComplete,
  onCancel
}: TenancyApplicationWorkflowProps) {

  const { data: session, status } = useSession();
  const [application, setApplication] = useState<TenancyApplication | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type ContactPreferences = {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
  };

  const [contactPreferences, setContactPreferences] = useState<ContactPreferences>({
    email: true,
    sms: false,
    whatsapp: false,
  });

  // Applicant details
  const [applicantName, setApplicantName] = useState(session?.user?.name || '');
  const [applicantEmail, setApplicantEmail] = useState(session?.user?.email || '');
  const [applicantTel, setApplicantTel] = useState('');

  useEffect(() => {
    if (!session?.user?.email) return;
    let cancelled = false;

    async function loadProfilePrefill() {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        const phone = data.profile?.phone;
        const prefs = data.profile?.contactPreferences;
        // NOTE: Reference contact fields are collected later in the process.

        if (typeof phone === 'string' && !applicantTel) setApplicantTel(phone);
        if (prefs && typeof prefs === 'object') {
          setContactPreferences((prev) => ({
            email: typeof prefs.email === 'boolean' ? prefs.email : prev.email,
            sms: typeof prefs.sms === 'boolean' ? prefs.sms : prev.sms,
            whatsapp: typeof prefs.whatsapp === 'boolean' ? prefs.whatsapp : prev.whatsapp,
          }));
        }
      } catch {
        // ignore prefill errors
      }
    }

    loadProfilePrefill();
    return () => {
      cancelled = true;
    };
  }, [
    session?.user?.email,
    applicantTel,
  ]);

  // Block unauthenticated users from starting the workflow
  if (status === "loading") {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold mb-4">Loading...</h2>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold mb-4">Sign in required</h2>
        <p className="text-gray-600 mb-4">You must be signed in to arrange a viewing.</p>
        <button
          onClick={() => window.location.href = "/api/auth/signin"}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Sign in
        </button>
      </div>
    );
  }

  const handleStartApplication = async () => {
    if (!applicantName || !applicantEmail || !applicantTel) {
      setError('Please fill in your name, email, and phone number');
      return;
    }

    if (!contactPreferences.email && !contactPreferences.sms && !contactPreferences.whatsapp) {
      setError('Please choose at least one contact method (email, SMS, or WhatsApp).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tenancy-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          applicantName,
          applicantEmail,
          applicantTel,
          contactPreferences,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to start application');
        return;
      }

      // Fetch the created application (for consistency with existing flow)
      const appResponse = await fetch(`/api/tenancy-applications/${data.applicationId}`);
      const appData = await appResponse.json();
      setApplication(appData.application);

    } catch {
      setError('An error occurred while starting your application');
    } finally {
      setLoading(false);
    }
  };

  const renderProgressIndicator = () => {
    if (!application) return null;

    const stages = [
      { number: 1, name: TENANCY_APPLICATION_STAGE_LABELS[1], status: application.stage1.status },
      { number: 2, name: TENANCY_APPLICATION_STAGE_LABELS[2], status: application.stage2.status },
      { number: 3, name: TENANCY_APPLICATION_STAGE_LABELS[3], status: application.stage3.status },
      { number: 4, name: TENANCY_APPLICATION_STAGE_LABELS[4], status: application.stage4.status },
      { number: 5, name: TENANCY_APPLICATION_STAGE_LABELS[5], status: application.stage5.status },
      { number: 6, name: TENANCY_APPLICATION_STAGE_LABELS[6], status: application.stage6.status }
    ];

    return (
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {stages.map((stage, index) => (
            <div key={stage.number} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                application.currentStage > stage.number
                  ? 'bg-green-500 text-white'
                  : application.currentStage === stage.number
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-600'
              }`}>
                {stage.number}
              </div>
              <span className="ml-2 text-sm hidden sm:inline">{stage.name}</span>
              {index < stages.length - 1 && (
                <div className={`w-12 h-1 mx-2 ${
                  application.currentStage > stage.number ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (application) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Thank you</h2>
          <p className="mt-3 text-gray-700">
            Your viewing request has been sent. The landlord will get back to you to confirm the viewing.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Property: {propertyTitle}
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              if (onComplete) return onComplete();
              if (onCancel) return onCancel();
              setApplication(null);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* {renderApplicantBackgroundInfo()} */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Arrange a viewing</h2>
        <p className="text-gray-600">Property: {propertyTitle}</p>
      </div>

      <div className="space-y-6">
        {/* Applicant Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name *</label>
            <input
              type="text"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Enter your full name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              value={applicantEmail}
              onChange={(e) => setApplicantEmail(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Enter your email address"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Phone *</label>
            <input
              type="tel"
              value={applicantTel}
              onChange={(e) => setApplicantTel(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Enter your phone number"
              required
            />
          </div>
        </div>

        {/* Contact preferences */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Contact preferences</h3>
          <p className="text-sm text-gray-600">Choose how you’d like to receive viewing updates.</p>

          <label className="flex items-start gap-3 rounded-lg border p-3">
            <input
              type="checkbox"
              checked={contactPreferences.email}
              onChange={(e) =>
                setContactPreferences((prev) => ({
                  ...prev,
                  email: e.target.checked,
                }))
              }
              className="mt-1"
            />
            <div>
              <div className="font-medium">Email</div>
              <div className="text-sm text-gray-600">Receive viewing updates via email.</div>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-lg border p-3">
            <input
              type="checkbox"
              checked={contactPreferences.sms}
              onChange={(e) =>
                setContactPreferences((prev) => ({
                  ...prev,
                  sms: e.target.checked,
                }))
              }
              disabled={!applicantTel}
              className="mt-1 disabled:opacity-50"
            />
            <div>
              <div className="font-medium">SMS</div>
              <div className="text-sm text-gray-600">
                Receive viewing updates by text {!applicantTel ? '(requires phone number)' : ''}.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-lg border p-3">
            <input
              type="checkbox"
              checked={contactPreferences.whatsapp}
              onChange={(e) =>
                setContactPreferences((prev) => ({
                  ...prev,
                  whatsapp: e.target.checked,
                }))
              }
              disabled={!applicantTel}
              className="mt-1 disabled:opacity-50"
            />
            <div>
              <div className="font-medium">WhatsApp</div>
              <div className="text-sm text-gray-600">
                Receive viewing updates via WhatsApp {!applicantTel ? '(requires phone number)' : ''}.
              </div>
            </div>
          </label>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="flex flex-col items-end pt-6">
         <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleStartApplication}
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold text-lg rounded-lg shadow-lg hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-200 disabled:opacity-50 border-2 border-blue-700"
            aria-label="Send viewing request"
          >
            {loading ? (
              <span className="flex items-center"><svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>Sending...</span>
            ) : (
              <span>Send viewing request</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}