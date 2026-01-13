"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { TenancyApplication } from '@/lib/tenancy-application';

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
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stage 1: Viewing Agreement
  const [viewingType, setViewingType] = useState<'onsite' | 'virtual' | null>(null);
  const [preferredDate, setPreferredDate] = useState('');

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
    console.log('Start Application button clicked');
    if (!applicantName || !applicantEmail) {
      setError('Please fill in your name and email');
      return;
    }
    // Require all Stage 2 consents
    if (!creditCheckConsent || !socialMediaConsent || !landlordReferenceConsent || !employerReferenceConsent) {
      setError('You must grant permission for all background checks in Stage 2 to continue.');
      return;
    }

    setLoading(true);
    setError(null);
    // Temporary visual feedback
    setTimeout(() => {
      if (loading) setError('Button click registered, waiting for response...');
    }, 1500);
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
          viewingType,
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

      // Fetch the created application
      const appResponse = await fetch(`/api/tenancy-applications/${data.applicationId}`);
      const appData = await appResponse.json();
      setApplication(appData.application);
      setShowConfirmationModal(true);

    } catch {
      setError('An error occurred while starting your application');
    } finally {
      setLoading(false);
    }
  };

  const renderStage1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Stage 1: Property Viewing</h3>
        <p className="text-gray-600">Would you like to arrange a property viewing?</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Viewing Type</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="viewingType"
                value="onsite"
                checked={viewingType === 'onsite'}
                onChange={(e) => setViewingType(e.target.value as 'onsite')}
                className="mr-2"
              />
              On-site viewing
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="viewingType"
                value="virtual"
                checked={viewingType === 'virtual'}
                onChange={(e) => setViewingType(e.target.value as 'virtual')}
                className="mr-2"
              />
              Virtual viewing
            </label>
          </div>
        </div>

        {viewingType && (
          <div>
            <label className="block text-sm font-medium mb-2">Preferred Date (Optional)</label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="w-full p-2 border rounded-md"
              min={new Date().toISOString().split('T')[0]}
              aria-label="Preferred Date"
            />
          </div>
        )}
      </div>
    </div>
  );

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

  const renderProgressIndicator = () => {
    if (!application) return null;

    const stages = [
      { number: 1, name: 'Viewing', status: application.stage1.status },
      { number: 2, name: 'Checks', status: application.stage2.status },
      { number: 3, name: 'Documents', status: application.stage3.status },
      { number: 4, name: 'Signing', status: application.stage4.status },
      { number: 5, name: 'Move-in', status: application.stage5.status },
      { number: 6, name: 'Complete', status: application.stage6.status }
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
        {/* {renderApplicantBackgroundInfo()} */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Tenancy Application</h2>
          <p className="text-gray-600">Property: {propertyTitle}</p>
        </div>

        {renderProgressIndicator()}

        <div className="text-center text-gray-500">
          <p>Application created successfully!</p>
          <p className="text-sm mt-2">Application ID: {application._id?.toString()}</p>
          <p className="text-sm">Current Stage: {application.currentStage}</p>
          {application.stage2?.sentAt && (
            <div className="mt-4 inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold border border-green-300">
              Application form sent: {new Date(application.stage2.sentAt).toLocaleString()}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onComplete}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Continue
          </button>
        </div>

        {/* Confirmation Modal */}
        {showConfirmationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
              <h3 className="text-xl font-bold mb-4 text-green-700">Request Sent!</h3>
              <p className="mb-2">The application form link has been sent to the applicant via email and SMS.</p>
              <p className="mb-4 text-sm text-gray-500">Please inform the applicant to check their inbox and spam folder.</p>
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
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
            <label className="block text-sm font-medium mb-2">Phone</label>
            <input
              type="tel"
              value={applicantTel}
              onChange={(e) => setApplicantTel(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Enter your phone number"
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

        {renderStage1()}
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