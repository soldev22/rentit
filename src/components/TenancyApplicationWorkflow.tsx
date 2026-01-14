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

  // Stage 2: Background Checks
  const [creditCheckConsent, setCreditCheckConsent] = useState(false);
  const [socialMediaConsent, setSocialMediaConsent] = useState(false);
  const [landlordReferenceConsent, setLandlordReferenceConsent] = useState(false);
  const [employerReferenceConsent, setEmployerReferenceConsent] = useState(false);

  // Applicant details
  const [applicantName, setApplicantName] = useState(session?.user?.name || '');
  const [applicantEmail, setApplicantEmail] = useState(session?.user?.email || '');
  const [applicantTel, setApplicantTel] = useState('');
  const [applicantAddress, setApplicantAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    postcode: ''
  });

  // Reference contacts (prefilled from profile where possible)
  const [employerName, setEmployerName] = useState('');
  const [employerEmail, setEmployerEmail] = useState('');
  const [previousEmployerName, setPreviousEmployerName] = useState('');
  const [previousEmployerEmail, setPreviousEmployerEmail] = useState('');
  const [prevLandlordName, setPrevLandlordName] = useState('');
  const [prevLandlordContact, setPrevLandlordContact] = useState('');
  const [prevLandlordEmail, setPrevLandlordEmail] = useState('');

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
        const address = data.profile?.address;
        const bg = data.profile?.backgroundCheck;

        if (typeof phone === 'string' && !applicantTel) setApplicantTel(phone);
        if (address && !applicantAddress.line1) {
          setApplicantAddress({
            line1: address?.line1 ?? '',
            line2: address?.line2 ?? '',
            city: address?.city ?? '',
            postcode: address?.postcode ?? '',
          });
        }

        if (bg) {
          if (typeof bg.employerName === 'string' && !employerName) setEmployerName(bg.employerName);
          if (typeof bg.employerEmail === 'string' && !employerEmail) setEmployerEmail(bg.employerEmail);
          if (typeof bg.previousEmployerName === 'string' && !previousEmployerName) setPreviousEmployerName(bg.previousEmployerName);
          if (typeof bg.previousEmployerEmail === 'string' && !previousEmployerEmail) setPreviousEmployerEmail(bg.previousEmployerEmail);
          if (typeof bg.prevLandlordName === 'string' && !prevLandlordName) setPrevLandlordName(bg.prevLandlordName);
          if (typeof bg.prevLandlordContact === 'string' && !prevLandlordContact) setPrevLandlordContact(bg.prevLandlordContact);
          if (typeof bg.prevLandlordEmail === 'string' && !prevLandlordEmail) setPrevLandlordEmail(bg.prevLandlordEmail);
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
    applicantAddress.line1,
    employerName,
    employerEmail,
    previousEmployerName,
    previousEmployerEmail,
    prevLandlordName,
    prevLandlordContact,
    prevLandlordEmail,
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
        <p className="text-gray-600 mb-4">You must be signed in to start a tenancy application.</p>
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
    // Require all Stage 2 consents
    if (!creditCheckConsent || !socialMediaConsent || !landlordReferenceConsent || !employerReferenceConsent) {
      setError('You must grant permission for all background checks in Stage 2 to continue.');
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
          applicantAddress: applicantAddress.line1 ? applicantAddress : undefined,
          referenceContacts: {
            employerName: employerName || undefined,
            employerEmail: employerEmail || undefined,
            previousEmployerName: previousEmployerName || undefined,
            previousEmployerEmail: previousEmployerEmail || undefined,
            prevLandlordName: prevLandlordName || undefined,
            prevLandlordContact: prevLandlordContact || undefined,
            prevLandlordEmail: prevLandlordEmail || undefined,
          },
          backgroundCheckConsents: {
            creditCheck: creditCheckConsent,
            socialMedia: socialMediaConsent,
            landlordReference: landlordReferenceConsent,
            employerReference: employerReferenceConsent
          }
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

  const renderStage2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Stage 2: Background Checks</h3>
        <p className="text-gray-600">Please consent to the following background checks</p>
      </div>

      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={creditCheckConsent}
              onChange={(e) => setCreditCheckConsent(e.target.checked)}
              className="mt-1"
            />
            <div>
              <div className="font-medium">Credit Check Consent</div>
              <div className="text-sm text-gray-600">
                I consent to a credit check being performed on my financial history
              </div>
            </div>
          </label>
        </div>

        <div className="border rounded-lg p-4">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={socialMediaConsent}
              onChange={(e) => setSocialMediaConsent(e.target.checked)}
              className="mt-1"
            />
            <div>
              <div className="font-medium">Social Media Check Consent</div>
              <div className="text-sm text-gray-600">
                I consent to social media background checks
              </div>
            </div>
          </label>
        </div>

        <div className="border rounded-lg p-4">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={landlordReferenceConsent}
              onChange={(e) => setLandlordReferenceConsent(e.target.checked)}
              className="mt-1"
            />
            <div>
              <div className="font-medium">Previous Landlord Reference</div>
              <div className="text-sm text-gray-600">
                I consent to contacting my previous landlord(s) for reference
              </div>
            </div>
          </label>
        </div>

        <div className="border rounded-lg p-4">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={employerReferenceConsent}
              onChange={(e) => setEmployerReferenceConsent(e.target.checked)}
              className="mt-1"
            />
            <div>
              <div className="font-medium">Employer Reference</div>
              <div className="text-sm text-gray-600">
                I consent to contacting my employer for reference
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );

  const renderReferenceContacts = () => (
    <div className="space-y-2">
      <h3 className="text-lg font-medium">Employer & landlord references</h3>
      <p className="text-sm text-gray-600">
        Add these now so your application is ready. We also save them to your profile for next time.
      </p>

      <div className="border rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="ref-employer-name">Employer name</label>
            <input
              id="ref-employer-name"
              type="text"
              value={employerName}
              onChange={(e) => setEmployerName(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Optional"
              title="Employer name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="ref-employer-email">Employer email</label>
            <input
              id="ref-employer-email"
              type="email"
              value={employerEmail}
              onChange={(e) => setEmployerEmail(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="name@company.com"
              title="Employer email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="ref-prev-employer-name">Previous employer name</label>
            <input
              id="ref-prev-employer-name"
              type="text"
              value={previousEmployerName}
              onChange={(e) => setPreviousEmployerName(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Optional"
              title="Previous employer name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="ref-prev-employer-email">Previous employer email</label>
            <input
              id="ref-prev-employer-email"
              type="email"
              value={previousEmployerEmail}
              onChange={(e) => setPreviousEmployerEmail(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Optional"
              title="Previous employer email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="ref-prev-landlord-name">Previous landlord name</label>
            <input
              id="ref-prev-landlord-name"
              type="text"
              value={prevLandlordName}
              onChange={(e) => setPrevLandlordName(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Optional"
              title="Previous landlord name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="ref-prev-landlord-contact">Previous landlord contact</label>
            <input
              id="ref-prev-landlord-contact"
              type="text"
              value={prevLandlordContact}
              onChange={(e) => setPrevLandlordContact(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Phone or email (optional)"
              title="Previous landlord contact"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1" htmlFor="ref-prev-landlord-email">Previous landlord email</label>
            <input
              id="ref-prev-landlord-email"
              type="email"
              value={prevLandlordEmail}
              onChange={(e) => setPrevLandlordEmail(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Optional"
              title="Previous landlord email"
            />
          </div>
        </div>
      </div>
    </div>
  );

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
            The landlord will get back to you to confirm the viewing.
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
        <h2 className="text-2xl font-bold">Start Tenancy Application</h2>
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

        {/* Address */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Current Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Address Line 1</label>
              <input
                type="text"
                value={applicantAddress.line1}
                onChange={(e) => setApplicantAddress({...applicantAddress, line1: e.target.value})}
                className="w-full p-2 border rounded-md"
                placeholder="Enter address line 1"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Address Line 2</label>
              <input
                type="text"
                value={applicantAddress.line2}
                onChange={(e) => setApplicantAddress({...applicantAddress, line2: e.target.value})}
                className="w-full p-2 border rounded-md"
                placeholder="Enter address line 2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <input
                type="text"
                value={applicantAddress.city}
                onChange={(e) => setApplicantAddress({...applicantAddress, city: e.target.value})}
                className="w-full p-2 border rounded-md"
                placeholder="Enter city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Postcode</label>
              <input
                type="text"
                value={applicantAddress.postcode}
                onChange={(e) => setApplicantAddress({...applicantAddress, postcode: e.target.value})}
                className="w-full p-2 border rounded-md"
                placeholder="Enter postcode"
              />
            </div>
          </div>
        </div>

        {renderReferenceContacts()}
        {renderStage2()}

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
            aria-label="Start Application Stage 2"
          >
            {loading ? (
              <span className="flex items-center"><svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>Starting Application...</span>
            ) : (
              <span>Send Application Form</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}