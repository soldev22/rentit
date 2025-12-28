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

  // Restore missing handleOpenViewingModal function for Schedule Viewing button
  function handleOpenViewingModal() {
    // This should open the viewing modal (if implemented)
    // For now, just show a message or implement modal logic as needed
    setMessage('Viewing modal not implemented.');
  }

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
    </div>
  );
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // --- Stage 2: Background Checks logic (moved from top level) ---
  const [stage2Loading, setStage2Loading] = useState(false);
  const [showStage2Modal, setShowStage2Modal] = useState(false);
  const [stage2SentAt, setStage2SentAt] = useState(currentApplication.stage2?.sentAt || null);

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
      {backgroundInfoPanel}
      {/* <ViewingModal /> */}
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
                  {currentApplication.stage1.status === 'agreed' ? (
                    <div className="text-xs text-green-800 mb-1">
                      Viewing Agreed: {currentApplication.stage1.viewingDetails?.date ? (
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



      {/* Messages */}
      {message && (
        <div className={`p-4 rounded-md ${
          message && message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}