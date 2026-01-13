  "use client";
// Remove global handleOpenViewingModal. Move inside component to access setMessage.
// --- Stage 2: Background Checks logic ---
// Stage 2 logic will be moved inside the component
import { useState } from 'react';
import type { TenancyApplication } from '@/lib/tenancy-application';

// Removed unused handleStageUpdate function to resolve lint error

// Simple modal for confirmation
function ConfirmModal({ open, onConfirm, onCancel }: { open: boolean, onConfirm: () => void, onCancel: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold mb-2">Delete Application?</h2>
        <p className="mb-4 text-gray-700">Are you sure you want to delete this application? This action cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <button className="px-4 py-2 bg-gray-200 rounded" onClick={onCancel}>Cancel</button>
          <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

interface TenancyApplicationManagerProps {
  application: TenancyApplication;
}

export default function TenancyApplicationManager({ application }: TenancyApplicationManagerProps) {
  // State hooks must come first
  const [currentApplication, setCurrentApplication] = useState(application);
  const [message, setMessage] = useState<string | null>(null);

  const [manualEmployerName, setManualEmployerName] = useState<string>(currentApplication.stage2?.referenceContacts?.employerName || currentApplication.stage2?.backgroundInfo?.employerName || '');
  const [manualEmployerEmail, setManualEmployerEmail] = useState<string>(currentApplication.stage2?.referenceContacts?.employerEmail || currentApplication.stage2?.backgroundInfo?.employerEmail || '');
  const [manualPrevEmployerName, setManualPrevEmployerName] = useState<string>(currentApplication.stage2?.referenceContacts?.previousEmployerName || currentApplication.stage2?.backgroundInfo?.previousEmployerName || '');
  const [manualPrevEmployerEmail, setManualPrevEmployerEmail] = useState<string>(currentApplication.stage2?.referenceContacts?.previousEmployerEmail || currentApplication.stage2?.backgroundInfo?.previousEmployerEmail || '');
  const [manualPrevLandlordName, setManualPrevLandlordName] = useState<string>(currentApplication.stage2?.referenceContacts?.prevLandlordName || currentApplication.stage2?.backgroundInfo?.prevLandlordName || '');
  const [manualPrevLandlordContact, setManualPrevLandlordContact] = useState<string>(currentApplication.stage2?.referenceContacts?.prevLandlordContact || currentApplication.stage2?.backgroundInfo?.prevLandlordContact || '');
  const [manualPrevLandlordEmail, setManualPrevLandlordEmail] = useState<string>(currentApplication.stage2?.referenceContacts?.prevLandlordEmail || currentApplication.stage2?.backgroundInfo?.prevLandlordEmail || '');
  const [manualSaveLoading, setManualSaveLoading] = useState(false);

  // Modal state for scheduling a viewing
  const [viewingModalOpen, setViewingModalOpen] = useState(false);
  const [viewingDate, setViewingDate] = useState<string>("");
  const [viewingTime, setViewingTime] = useState<string>("");
  const [viewingNote, setViewingNote] = useState<string>("");
  function handleOpenViewingModal() {
    const existingDate = currentApplication.stage1.viewingDetails?.date;
    const existingTime = currentApplication.stage1.viewingDetails?.time;
    const existingNote = currentApplication.stage1.viewingDetails?.note;

    // Prefill when editing an existing agreed viewing.
    if (existingDate) setViewingDate(existingDate);
    else if (currentApplication.stage1.preferredDate) setViewingDate(currentApplication.stage1.preferredDate);
    else setViewingDate("");

    setViewingTime(existingTime ?? "");
    setViewingNote(existingNote ?? "");

    setViewingModalOpen(true);
  }
  function handleCloseViewingModal() {
    setViewingModalOpen(false);
    setViewingDate("");
    setViewingTime("");
    setViewingNote("");
  }
  async function handleSubmitViewingModal(e: React.FormEvent) {
    e.preventDefault();

    setMessage(null);
    try {
      const response = await fetch(
        `/api/tenancy-applications/${currentApplication._id}/schedule-viewing`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: viewingDate, time: viewingTime, note: viewingNote }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setMessage(data?.error || "Failed to schedule viewing");
        return;
      }

      const data = await response.json().catch(() => null);
      const emailFailedReason =
        data?.notification?.email?.attempted === true && data?.notification?.email?.sent === false
          ? (data?.notification?.email?.error || 'Email failed to send')
          : null;

      setMessage(
        emailFailedReason
          ? `Viewing scheduled for ${viewingDate} at ${viewingTime}. Email not sent: ${emailFailedReason}.`
          : `Viewing scheduled for ${viewingDate} at ${viewingTime}.`
      );
      setViewingModalOpen(false);

      const refreshed = await fetch(`/api/tenancy-applications/${currentApplication._id}`);
      if (refreshed.ok) {
        const freshData = await refreshed.json();
        setCurrentApplication(freshData.application ?? freshData);
      }
    } catch {
      setMessage("An error occurred while scheduling the viewing.");
    }
  }
  // Viewing Modal JSX (move to return)
  const viewingModal = viewingModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-2">Schedule Viewing</h2>
        <form onSubmit={handleSubmitViewingModal} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="viewing-date">Date</label>
            <input
              id="viewing-date"
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              className="border rounded px-2 py-1 w-full"
              value={viewingDate}
              onChange={e => setViewingDate(e.target.value)}
              required
              title="Viewing date"
              placeholder="Select date"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="viewing-time">Time</label>
            <input id="viewing-time" type="time" className="border rounded px-2 py-1 w-full" value={viewingTime} onChange={e => setViewingTime(e.target.value)} required title="Viewing time" placeholder="Select time" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="viewing-note">Note (optional)</label>
            <textarea id="viewing-note" className="border rounded px-2 py-1 w-full" value={viewingNote} onChange={e => setViewingNote(e.target.value)} title="Additional notes" placeholder="Add a note (optional)" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" className="px-4 py-2 bg-gray-200 rounded" onClick={handleCloseViewingModal}>Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Schedule</button>
          </div>
        </form>
      </div>
    </div>
  );

  // Applicant Background Info (Stage 2) - always show, even if empty
  const info: Partial<NonNullable<TenancyApplication['stage2']>['backgroundInfo']> = currentApplication.stage2?.backgroundInfo || {};
  const backgroundInfoPanel = (
    <div className="bg-blue-50 rounded-lg shadow p-6 mb-8">
      <h2 className="text-lg font-semibold mb-4 text-blue-800">Applicant Background Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">Employment Status</p>
          <p className="font-medium">{info.employmentStatus || <span className="text-gray-400">Not provided</span>}</p>
          <p className="text-sm text-gray-600 mt-2">Employer Name</p>
          <p className="font-medium">{info.employerName || <span className="text-gray-400">Not provided</span>}</p>
          <p className="text-sm text-gray-600 mt-2">Employer Email</p>
          <p className="font-medium">{info.employerEmail || <span className="text-gray-400">Not provided</span>}</p>
          <p className="text-sm text-gray-600 mt-2">Previous Employer Name</p>
          <p className="font-medium">{info.previousEmployerName || <span className="text-gray-400">Not provided</span>}</p>
          <p className="text-sm text-gray-600 mt-2">Previous Employer Email</p>
          <p className="font-medium">{info.previousEmployerEmail || <span className="text-gray-400">Not provided</span>}</p>
          <p className="text-sm text-gray-600 mt-2">Employment Contract Type</p>
          <p className="font-medium">{info.employmentContractType || <span className="text-gray-400">Not provided</span>}</p>
          <p className="text-sm text-gray-600 mt-2">Job Title</p>
          <p className="font-medium">{info.jobTitle || <span className="text-gray-400">Not provided</span>}</p>
          <p className="text-sm text-gray-600 mt-2">Monthly Income</p>
          <p className="font-medium">{info.monthlyIncome ? `£${info.monthlyIncome}` : <span className="text-gray-400">Not provided</span>}</p>
          <p className="text-sm text-gray-600 mt-2">Employment Length</p>
          <p className="font-medium">{info.employmentLength || <span className="text-gray-400">Not provided</span>}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Previous Landlord Name</p>
          <p className="font-medium">{info.prevLandlordName || <span className="text-gray-400">Not provided</span>}</p>
          <p className="text-sm text-gray-600 mt-2">Previous Landlord Contact</p>
          <p className="font-medium">{info.prevLandlordContact || <span className="text-gray-400">Not provided</span>}</p>
          <p className="text-sm text-gray-600 mt-2">Previous Landlord Email</p>
          <p className="font-medium">{info.prevLandlordEmail || <span className="text-gray-400">Not provided</span>}</p>
          <p className="text-sm text-gray-600 mt-2">Credit Consent</p>
          <p className="font-medium">{info.creditConsent === true ? 'Yes' : info.creditConsent === false ? 'No' : <span className="text-gray-400">Not provided</span>}</p>
          <p className="text-sm text-gray-600 mt-2">Submitted At</p>
          <p className="font-medium">{info.submittedAt ? new Date(info.submittedAt).toLocaleString() : <span className="text-gray-400">Not provided</span>}</p>
          <p className="text-sm text-gray-600 mt-2">Photo ID</p>
          {info.photoIdFile ? (
            <div className="flex flex-col gap-1">
              <a
                href={info.photoIdFile}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-blue-700 underline hover:text-blue-900"
              >
                View Photo ID
              </a>
            </div>
          ) : (
            <span className="text-gray-400">No file uploaded</span>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-blue-200 pt-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Record/Update Reference Contacts (Landlord)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="manual-employer-name">Employer Name</label>
            <input
              id="manual-employer-name"
              className="w-full border rounded p-2"
              value={manualEmployerName}
              onChange={(e) => setManualEmployerName(e.target.value)}
              placeholder="Optional"
              title="Employer name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="manual-employer-email">Employer Email</label>
            <input
              id="manual-employer-email"
              type="email"
              className="w-full border rounded p-2"
              value={manualEmployerEmail}
              onChange={(e) => setManualEmployerEmail(e.target.value)}
              placeholder="name@company.com"
              title="Employer email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="manual-prev-employer-name">Previous Employer Name</label>
            <input
              id="manual-prev-employer-name"
              className="w-full border rounded p-2"
              value={manualPrevEmployerName}
              onChange={(e) => setManualPrevEmployerName(e.target.value)}
              placeholder="Optional"
              title="Previous employer name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="manual-prev-employer-email">Previous Employer Email</label>
            <input
              id="manual-prev-employer-email"
              type="email"
              className="w-full border rounded p-2"
              value={manualPrevEmployerEmail}
              onChange={(e) => setManualPrevEmployerEmail(e.target.value)}
              placeholder="Optional"
              title="Previous employer email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="manual-prev-landlord-name">Previous Landlord Name</label>
            <input
              id="manual-prev-landlord-name"
              className="w-full border rounded p-2"
              value={manualPrevLandlordName}
              onChange={(e) => setManualPrevLandlordName(e.target.value)}
              placeholder="Optional"
              title="Previous landlord name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="manual-prev-landlord-contact">Previous Landlord Contact</label>
            <input
              id="manual-prev-landlord-contact"
              className="w-full border rounded p-2"
              value={manualPrevLandlordContact}
              onChange={(e) => setManualPrevLandlordContact(e.target.value)}
              placeholder="Phone or email (optional)"
              title="Previous landlord contact"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="manual-prev-landlord-email">Previous Landlord Email</label>
            <input
              id="manual-prev-landlord-email"
              type="email"
              className="w-full border rounded p-2"
              value={manualPrevLandlordEmail}
              onChange={(e) => setManualPrevLandlordEmail(e.target.value)}
              placeholder="Optional"
              title="Previous landlord email"
            />
          </div>
        </div>
        <div className="mt-3">
          <button
            type="button"
            className="px-4 py-2 rounded-md font-medium transition-colors bg-white text-blue-700 border border-blue-300 hover:bg-blue-100 disabled:opacity-50"
            disabled={manualSaveLoading}
            onClick={async () => {
              setManualSaveLoading(true);
              setMessage(null);
              try {
                const res = await fetch(`/api/tenancy-applications/${currentApplication._id}`,
                  {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      stage2: {
                        referenceContacts: {
                          employerName: manualEmployerName,
                          employerEmail: manualEmployerEmail,
                          previousEmployerName: manualPrevEmployerName,
                          previousEmployerEmail: manualPrevEmployerEmail,
                          prevLandlordName: manualPrevLandlordName,
                          prevLandlordContact: manualPrevLandlordContact,
                          prevLandlordEmail: manualPrevLandlordEmail,
                        },
                      },
                    }),
                  }
                );
                const data = await res.json().catch(() => null);
                if (!res.ok) {
                  setMessage(data?.error || 'Failed to save reference contact details');
                  return;
                }
                setMessage('Reference contact details saved.');

                const refreshed = await fetch(`/api/tenancy-applications/${currentApplication._id}`);
                if (refreshed.ok) {
                  const freshData = await refreshed.json();
                  const nextApp = freshData.application ?? freshData;
                  setCurrentApplication(nextApp);
                  setStage2SentAt(nextApp.stage2?.sentAt || null);
                }
              } catch {
                setMessage('Failed to save reference contact details');
              } finally {
                setManualSaveLoading(false);
              }
            }}
          >
            {manualSaveLoading ? 'Saving…' : 'Save Reference Contacts'}
          </button>
        </div>
      </div>
    </div>
  );
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // --- Stage 2: Background Checks logic (moved from top level) ---
  const [stage2Loading, setStage2Loading] = useState(false);
  const [showStage2Modal, setShowStage2Modal] = useState(false);
  const [stage2SentAt, setStage2SentAt] = useState(currentApplication.stage2?.sentAt || null);

  const [creditScore, setCreditScore] = useState<string>('');
  const [ccjCount, setCcjCount] = useState<string>('0');
  const [creditReportUrl, setCreditReportUrl] = useState<string>('');
  const [creditModalOpen, setCreditModalOpen] = useState(false);

  async function refreshApplication() {
    const refreshed = await fetch(`/api/tenancy-applications/${currentApplication._id}`);
    if (!refreshed.ok) return;
    const freshData = await refreshed.json();
    const nextApp = freshData.application ?? freshData;
    setCurrentApplication(nextApp);
    setStage2SentAt(nextApp.stage2?.sentAt || null);
  }

  async function handleSendEmployerVerification() {
    setMessage(null);
    try {
      const res = await fetch(`/api/tenancy-applications/${currentApplication._id}/employer-verification-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(data?.error || 'Failed to send employer verification link');
        return;
      }
      const suffix = data?.link ? ` Link: ${data.link}` : '';
      setMessage(`Employer verification link sent to ${data?.to || 'employer'}.${suffix}`);
      await refreshApplication();
    } catch {
      setMessage('Failed to send employer verification link');
    }
  }

  async function handleSendLandlordReference() {
    setMessage(null);
    try {
      const res = await fetch(`/api/tenancy-applications/${currentApplication._id}/landlord-reference-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(data?.error || 'Failed to send previous landlord reference link');
        return;
      }
      const suffix = data?.link ? ` Link: ${data.link}` : '';
      setMessage(`Previous landlord reference link sent to ${data?.to || 'previous landlord'}.${suffix}`);
      await refreshApplication();
    } catch {
      setMessage('Failed to send previous landlord reference link');
    }
  }

  async function handleSubmitCreditCheck(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const scoreNum = Number(creditScore);
    const ccjNum = Number(ccjCount);
    if (!Number.isFinite(scoreNum) || !Number.isFinite(ccjNum)) {
      setMessage('Please enter a valid Experian score and CCJ count.');
      return;
    }

    try {
      const res = await fetch(`/api/tenancy-applications/${currentApplication._id}/credit-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experianScore: scoreNum, ccjCount: ccjNum, reportUrl: creditReportUrl || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(data?.error || 'Failed to record credit check');
        return;
      }
      setMessage(data?.passed ? 'Credit check recorded: PASS' : `Credit check recorded: FAIL (${data?.failureReason || 'criteria not met'})`);
      setCreditModalOpen(false);

      const refreshed = await fetch(`/api/tenancy-applications/${currentApplication._id}`);
      if (refreshed.ok) {
        const freshData = await refreshed.json();
        setCurrentApplication(freshData.application ?? freshData);
      }
    } catch {
      setMessage('Failed to record credit check');
    }
  }

  const creditModal = creditModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-2">Record Credit Check</h2>
        <form onSubmit={handleSubmitCreditCheck} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Experian Score</label>
            <input
              id="credit-score"
              title="Experian score"
              placeholder="e.g. 820"
              className="border rounded px-2 py-1 w-full"
              value={creditScore}
              onChange={e => setCreditScore(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CCJ Count</label>
            <input
              id="ccj-count"
              title="CCJ count"
              placeholder="e.g. 0"
              className="border rounded px-2 py-1 w-full"
              value={ccjCount}
              onChange={e => setCcjCount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Report URL (optional)</label>
            <input
              id="credit-report-url"
              title="Credit report URL"
              placeholder="https://..."
              className="border rounded px-2 py-1 w-full"
              value={creditReportUrl}
              onChange={e => setCreditReportUrl(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" className="px-4 py-2 bg-gray-200 rounded" onClick={() => setCreditModalOpen(false)}>Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
          </div>
        </form>
      </div>
    </div>
  );

  async function handleStage2Action() {
    setStage2Loading(true);
    setMessage(null);
    try {
      // Call API to trigger background check request (token/email/SMS)
      const response = await fetch(`/api/tenancy-applications/${currentApplication._id}/background-check-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const data = await response.json();
        setMessage(data.error || 'Failed to send background check request');
        setStage2Loading(false);
        return;
      }
      const data = await response.json();
      setShowStage2Modal(true);
      setStage2SentAt(data.sentAt || new Date().toISOString());
      setMessage('Background check request sent successfully.');
      // After background info is submitted, refetch the application to update UI
      // (Assumes an API route exists to fetch the latest application by ID)
      setTimeout(async () => {
        try {
          const refreshed = await fetch(`/api/tenancy-applications/${currentApplication._id}`);
          if (refreshed.ok) {
            const freshData = await refreshed.json();
            setCurrentApplication(freshData);
          }
        } catch {}
      }, 1000); // Delay to allow backend to update
    } catch {
      setMessage('An error occurred while sending the request.');
    } finally {
      setStage2Loading(false);
    }
  }

  // Confirmation modal for Stage 2
  function Stage2ConfirmationModal() {
    if (!showStage2Modal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h3 className="text-xl font-bold mb-4 text-green-700">Request Sent!</h3>
          <p className="mb-2">The application form link has been sent to the applicant via email and SMS.</p>
          <p className="mb-4 text-sm text-gray-500">Please inform the applicant to check their inbox and spam folder.</p>
          <button
            onClick={() => setShowStage2Modal(false)}
            className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Helper to get stage status (no dynamic access)
  // (Removed  getStageStatus function)

  // Helper to get stage card color
  // (Removed unused getStageColor function)


  // Handler to jump to a stage (for demo, just scrolls to controls, could be improved)
  // (Removed unused handleGoToStage function)

  // --- Stage 1 Viewing Agreement Modal ---
  // Removed unused viewingDate and related logic to resolve lint error.

  // Show viewing details if scheduled
  // Use agreedAt and preferredDate from stage1

  // Stage 1 controls: allow rescheduling and resending notification


  const stages = [
    { number: 1, name: 'Viewing Agreement', description: 'Property viewing arrangements' },
    { number: 2, name: 'Background Checks', description: 'Credit and reference checks' },
    { number: 3, name: 'Document Pack', description: 'Legal documents sent to applicant' },
    { number: 4, name: 'Document Signing', description: 'Online and physical signatures' },
    { number: 5, name: 'Move-in Date', description: 'Tenancy start date confirmation' },
    { number: 6, name: 'Final Documentation', description: 'Inventory and keys handover' }
  ];

  // --- All renderStageXControls functions must be defined before the return ---
  // (Insert all renderStage1Controls, renderStage2Controls, ..., renderStage6Controls here, unchanged)

  // Main return at the end
  return (
    <div className="space-y-8">
      {/* Messages (keep near top so actions feel responsive) */}
      {message && (
        <div
          className={`p-4 rounded-md ${
            /\b(failed|error)\b/i.test(message) ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
          }`}
        >
          {message}
        </div>
      )}

      {viewingModal}
      {creditModal}
      {backgroundInfoPanel}
      {/* Stage Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stages.map((stage) => {
          // Stage 1: always enabled
          if (stage.number === 1) {
            return (
              <div
                key={stage.number}
                className="rounded-lg border-2 p-4 shadow-sm flex flex-col justify-between border-green-400 bg-green-50"
              >
                <div>
                  <h4 className="text-lg font-semibold mb-1">Stage 1: {stage.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{stage.description}</p>
                  {currentApplication.stage1.status === 'agreed' || (viewingDate && viewingTime) ? (
                    <div className="text-xs text-green-800 mb-1">
                      Viewing Agreed: {viewingDate && viewingTime ? (
                        <span className="font-bold">
                          {new Date(viewingDate).toLocaleDateString('en-GB')} <span className="font-bold">{viewingTime}</span>
                        </span>
                      ) : currentApplication.stage1.viewingDetails?.date ? (
                        <span className="font-bold">
                          {new Date(currentApplication.stage1.viewingDetails.date).toLocaleDateString('en-GB')}
                          {currentApplication.stage1.viewingDetails.time ? (
                            <>
                              {' '}<span className="font-bold">{currentApplication.stage1.viewingDetails.time}</span>
                            </>
                          ) : null}
                        </span>
                      ) : (
                        currentApplication.stage1.preferredDate ? (
                          <span className="font-bold">{new Date(currentApplication.stage1.preferredDate).toLocaleDateString('en-GB')}</span>
                        ) : ''
                      )}
                      {currentApplication.stage1.viewingType && (
                        <> ({currentApplication.stage1.viewingType})</>
                      )}
                      {/* Show notes if available */}
                      {(viewingNote || currentApplication.stage1.viewingDetails?.note) && (
                        <div className="mt-1 text-xs text-blue-900">
                          <span className="font-semibold">Notes:</span> {viewingNote || currentApplication.stage1.viewingDetails?.note}
                        </div>
                      )}
                      {currentApplication.stage1.agreedAt && (
                        <>
                          <br />
                          <span className="text-xs text-gray-700">
                            Last Notified:{' '}
                            {(() => {
                              const d = new Date(currentApplication.stage1.agreedAt);
                              return !isNaN(d.getTime())
                                ? `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                                : currentApplication.stage1.agreedAt;
                            })()}
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-yellow-800 mb-1">No viewing scheduled yet.</div>
                  )}
                  <span className="inline-block px-2 py-1 rounded text-xs font-medium mb-2 bg-green-200 text-green-800">
                    {currentApplication.stage1.status === 'agreed' ? 'AGREED' : 'NOT SCHEDULED'}
                  </span>
                </div>
                <button
                  className="mt-2 px-4 py-2 rounded-md font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleOpenViewingModal}
                  disabled={false}
                  aria-label="Schedule Viewing"
                >
                  {currentApplication.stage1.status === 'agreed' ? 'Edit / Resend Notification' : 'Schedule Viewing'}
                </button>
              </div>
            );
          }

          // Stage 2: enabled if currentApplication.stage2?.enabled
          if (stage.number === 2) {
            // Stage 2 is enabled if status is not 'pending'
            const enabled = currentApplication.stage2.status !== 'pending';
            return (
              <div
                key={stage.number}
                className={
                  enabled
                    ? "rounded-lg border-2 p-4 shadow-sm flex flex-col justify-between border-blue-400 bg-blue-50"
                    : "rounded-lg border-2 p-4 shadow-sm flex flex-col justify-between border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed"
                }
              >
                <div>
                  <h4 className="text-lg font-semibold mb-1">Stage 2: {stage.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{stage.description}</p>
                  <span className={
                    enabled
                      ? "inline-block px-2 py-1 rounded text-xs font-medium mb-2 bg-blue-200 text-blue-800"
                      : "inline-block px-2 py-1 rounded text-xs font-medium mb-2 bg-gray-200 text-gray-800"
                  }>
                    {enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                  {enabled && (
                    <div className="mt-2 space-y-1 text-sm">
                      <div>
                        {currentApplication.stage2.creditCheckConsent ? '✔️' : '❌'} Credit Check Consent
                      </div>
                      <div>
                        {currentApplication.stage2.socialMediaConsent ? '✔️' : '❌'} Social Media Consent
                      </div>
                      <div>
                        {currentApplication.stage2.landlordReferenceConsent ? '✔️' : '❌'} Landlord Reference Consent
                      </div>
                      <div>
                        {currentApplication.stage2.employerReferenceConsent ? '✔️' : '❌'} Employer Reference Consent
                      </div>
                      {/* Show when background info was submitted, if available */}
                      {currentApplication.stage2?.backgroundInfo?.submittedAt && (
                        <div className="mt-2 inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full text-xs font-semibold border border-green-300">
                          Details submitted: {(() => {
                            const d = new Date(currentApplication.stage2.backgroundInfo.submittedAt);
                            return !isNaN(d.getTime())
                              ? `${d.toLocaleDateString('en-GB')}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                              : currentApplication.stage2.backgroundInfo.submittedAt;
                          })()}
                        </div>
                      )}
                      {stage2SentAt && (
                        <div className="mt-2 inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full text-xs font-semibold border border-green-300">
                          Background check request sent: {new Date(stage2SentAt).toLocaleString()}
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-blue-200 space-y-2">
                        <div className="text-sm font-semibold text-blue-900">Checks</div>
                        <div className="text-sm">
                          Credit check: <span className="font-semibold">{currentApplication.stage2.creditCheck?.status || 'not_started'}</span>
                          {currentApplication.stage2.creditCheck?.score != null ? (
                            <> (Score: <span className="font-semibold">{currentApplication.stage2.creditCheck.score}</span>)</>
                          ) : null}
                          {currentApplication.stage2.creditCheck?.ccjCount != null ? (
                            <> (CCJs: <span className="font-semibold">{currentApplication.stage2.creditCheck.ccjCount}</span>)</>
                          ) : null}
                        </div>
                        <div className="text-sm">
                          Employer verification: <span className="font-semibold">{currentApplication.stage2.employerVerification?.status || 'not_started'}</span>
                        </div>
                        {currentApplication.stage2.employerVerification?.token ? (
                          <div className="text-sm">
                            <a
                              className="text-blue-700 underline hover:text-blue-900"
                              href={`/reference/employer/${currentApplication._id}?token=${encodeURIComponent(currentApplication.stage2.employerVerification.token)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open employer form link (testing)
                            </a>
                          </div>
                        ) : null}
                        {currentApplication.stage2.employerVerification?.response ? (
                          <div className="text-xs text-gray-700 pl-2">
                            Employed:{' '}
                            <span className="font-semibold">
                              {currentApplication.stage2.employerVerification.response.employed === true
                                ? 'Yes'
                                : currentApplication.stage2.employerVerification.response.employed === false
                                  ? 'No'
                                  : '—'}
                            </span>
                            {currentApplication.stage2.employerVerification.response.contractType ? (
                              <> · Contract: <span className="font-semibold">{currentApplication.stage2.employerVerification.response.contractType}</span></>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="text-sm">
                          Previous landlord reference: <span className="font-semibold">{currentApplication.stage2.previousLandlordReference?.status || 'not_started'}</span>
                        </div>
                        {currentApplication.stage2.previousLandlordReference?.token ? (
                          <div className="text-sm">
                            <a
                              className="text-blue-700 underline hover:text-blue-900"
                              href={`/reference/landlord/${currentApplication._id}?token=${encodeURIComponent(currentApplication.stage2.previousLandlordReference.token)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open landlord reference form link (testing)
                            </a>
                          </div>
                        ) : null}
                        {currentApplication.stage2.previousLandlordReference?.response ? (
                          <div className="text-xs text-gray-700 pl-2">
                            Would rent again:{' '}
                            <span className="font-semibold">
                              {currentApplication.stage2.previousLandlordReference.response.wouldRentAgain === true
                                ? 'Yes'
                                : currentApplication.stage2.previousLandlordReference.response.wouldRentAgain === false
                                  ? 'No'
                                  : '—'}
                            </span>
                            {typeof currentApplication.stage2.previousLandlordReference.response.paidOnTime === 'boolean' ? (
                              <> · Paid on time: <span className="font-semibold">{currentApplication.stage2.previousLandlordReference.response.paidOnTime ? 'Yes' : 'No'}</span></>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="flex flex-col gap-2 pt-2">
                          <button
                            type="button"
                            className="px-4 py-2 rounded-md font-medium transition-colors bg-white text-blue-700 border border-blue-300 hover:bg-blue-100"
                            onClick={() => setCreditModalOpen(true)}
                          >
                            Record Credit Check
                          </button>
                          <button
                            type="button"
                            className="px-4 py-2 rounded-md font-medium transition-colors bg-white text-blue-700 border border-blue-300 hover:bg-blue-100"
                            onClick={handleSendEmployerVerification}
                          >
                            Send Employer Verification Link
                          </button>
                          <button
                            type="button"
                            className="px-4 py-2 rounded-md font-medium transition-colors bg-white text-blue-700 border border-blue-300 hover:bg-blue-100"
                            onClick={handleSendLandlordReference}
                          >
                            Send Previous Landlord Reference Link
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  className={
                    enabled
                      ? "mt-2 px-4 py-2 rounded-md font-bold transition-colors bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-800 shadow-lg"
                      : "mt-2 px-4 py-2 rounded-md font-medium transition-colors bg-gray-200 text-gray-400 cursor-not-allowed"
                  }
                  disabled={!enabled || stage2Loading}
                  onClick={enabled ? handleStage2Action : undefined}
                  aria-label="Start Background Checks"
                >
                  {stage2Loading ? 'Sending...' : (enabled ? 'Start Background Checks' : 'Disabled')}
                </button>
                <Stage2ConfirmationModal />
              </div>
            );
          }

          // All other stages: visually disabled, button disabled (can extend logic for later stages)
          return (
            <div
              key={stage.number}
              className="rounded-lg border-2 p-4 shadow-sm flex flex-col justify-between border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed"
            >
              <div>
                <h4 className="text-lg font-semibold mb-1">Stage {stage.number}: {stage.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{stage.description}</p>
                <span className="inline-block px-2 py-1 rounded text-xs font-medium mb-2 bg-gray-200 text-gray-800">
                  DISABLED
                </span>
              </div>
              <button
                className="mt-2 px-4 py-2 rounded-md font-medium transition-colors bg-gray-200 text-gray-400 cursor-not-allowed"
                disabled
              >
                Disabled
              </button>
            </div>
          );
        })}

      {/* Applicant Background Info (Stage 2) - now at top */}
      {backgroundInfoPanel}
      {/* Close the grid container div for stage cards */}
      </div>

      {/* Delete Button and Modal */}
      <div className="flex justify-end">
        <button
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={() => setDeleteModalOpen(true)}
          disabled={deleteLoading}
        >
          Delete Application
        </button>
      </div>
      <ConfirmModal
        open={deleteModalOpen}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={async () => {
          setDeleteLoading(true);
          setMessage(null);
          try {
            const response = await fetch(`/api/tenancy-applications/${currentApplication._id?.toString()}`, {
              method: 'DELETE',
            });
            if (response.ok) {
              setMessage('Application deleted successfully');
              window.location.href = '/landlord/applications';
            } else {
              const error = await response.json();
              setMessage(error.error || 'Failed to delete application');
            }
          } catch {
            setMessage('Error deleting application');
          } finally {
            setDeleteLoading(false);
            setDeleteModalOpen(false);
          }
        }}
      />
    </div>
  );
}