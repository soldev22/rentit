  "use client";
// Remove global handleOpenViewingModal. Move inside component to access setMessage.
// --- Stage 2: Background Checks logic ---
// Stage 2 logic will be moved inside the component
import { useState } from 'react';
import Link from 'next/link';
import type { TenancyApplication } from '@/lib/tenancy-application';
import { TENANCY_APPLICATION_STAGE_LABELS } from '@/lib/tenancyApplicationStages';

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

  const stage1Complete = Boolean(currentApplication.stage1?.viewingSummary?.completedAt);

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

  async function markStage1Complete() {
    if (stage1Complete) return;
    const ok = confirm('Mark Stage 1 as complete and enable Stage 2?');
    if (!ok) return;

    setMessage(null);
    try {
      const response = await fetch(`/api/tenancy-applications/${currentApplication._id}/viewing-checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage1Complete: true }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setMessage(data?.error || 'Failed to mark Stage 1 complete');
        return;
      }

      const refreshed = await fetch(`/api/tenancy-applications/${currentApplication._id}`);
      if (refreshed.ok) {
        const freshData = await refreshed.json().catch(() => null);
        setCurrentApplication(freshData?.application ?? freshData);
      }

      setMessage('Stage 1 marked complete. Stage 2 is now enabled.');
    } catch {
      setMessage('Failed to mark Stage 1 complete');
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
    { number: 1, name: TENANCY_APPLICATION_STAGE_LABELS[1], description: 'Viewing' },
    { number: 2, name: TENANCY_APPLICATION_STAGE_LABELS[2], description: 'Background checks and references' },
    { number: 3, name: TENANCY_APPLICATION_STAGE_LABELS[3], description: 'Send the document pack to the tenant(s)' },
    { number: 4, name: TENANCY_APPLICATION_STAGE_LABELS[4], description: 'Required documents signed' },
    { number: 5, name: TENANCY_APPLICATION_STAGE_LABELS[5], description: 'Move-in date agreed' },
    { number: 6, name: TENANCY_APPLICATION_STAGE_LABELS[6], description: 'Tenant settled and tenancy underway' }
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
            /\b(failed|error)\b/i.test(message)
              ? 'bg-red-50 text-red-800'
              : 'bg-green-50 text-green-800'
          }`}
        >
          {message}
        </div>
      )}

      {viewingModal}
      {/* Stage Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stages.map((stage) => {
          // Stage 1: always enabled
          if (stage.number === 1) {
            return (
              <div
                key={stage.number}
                className={
                  stage1Complete
                    ? "rounded-lg border-2 p-4 shadow-sm flex flex-col justify-between border-green-400 bg-green-50"
                    : "rounded-lg border-2 p-4 shadow-sm flex flex-col justify-between border-amber-400 bg-amber-50"
                }
              >
                <div>
                  <h4 className="text-lg font-semibold mb-1">Stage 1: {stage.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {currentApplication.stage1.status === 'agreed'
                      ? 'Property viewing arranged and agreed'
                      : 'Viewing not scheduled yet'}
                  </p>
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
                    <div className="text-xs text-yellow-800 mb-1">Viewing not scheduled yet.</div>
                  )}
                  <span
                    className={
                      stage1Complete
                        ? "inline-block px-2 py-1 rounded text-xs font-medium mb-2 bg-green-200 text-green-800"
                        : "inline-block px-2 py-1 rounded text-xs font-medium mb-2 bg-amber-200 text-amber-800"
                    }
                  >
                    {stage1Complete ? 'COMPLETE' : 'IN PROGRESS'}
                  </span>
                </div>

                <label className="mt-2 flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={stage1Complete}
                    disabled={stage1Complete}
                    onChange={() => {
                      void markStage1Complete();
                    }}
                  />
                  Stage 1 complete (enable Stage 2)
                </label>
                <button
                  className="mt-2 px-4 py-2 rounded-md font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleOpenViewingModal}
                  disabled={false}
                  aria-label="Schedule Viewing"
                >
                  {currentApplication.stage1.status === 'agreed' ? 'Edit / Resend Notification' : 'Schedule Viewing'}
                </button>

                <div className="mt-2 flex items-center gap-2">
                  <Link
                    href={`/landlord/applications/${currentApplication._id}/viewing-checklist`}
                    className="inline-block px-4 py-2 rounded-md font-medium transition-colors border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                  >
                    Viewing checklist
                  </Link>

                  <Link
                    href="/landlord/viewing-checklist-info"
                    className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50"
                    aria-label="Viewing checklist guidance"
                    title="Viewing checklist guidance"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.8}
                      stroke="currentColor"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.25 11.25h1.5v5.25h-1.5V11.25zM12 7.875h.008v.008H12V7.875z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          }

          // Stage 2: enabled if currentApplication.stage2?.enabled
          if (stage.number === 2) {
            const enabled = stage1Complete;

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
                  <div className="mt-3 rounded-lg border border-blue-200 bg-white p-4">
                    <div className="text-sm text-gray-700">
                      Dedicated background checks workspace with all actions, links, and pass/fail criteria.
                    </div>
                    {currentApplication.stage2?.sentAt ? (
                      <div className="mt-2 text-xs text-gray-600">
                        Last request sent: {new Date(currentApplication.stage2.sentAt).toLocaleString()}
                      </div>
                    ) : null}

                    <div className="mt-3">
                      <Link
                        href={`/landlord/applications/${currentApplication._id}/background-checks`}
                        className={
                          enabled
                            ? "inline-block px-4 py-2 rounded-md font-semibold transition-colors bg-blue-600 text-white hover:bg-blue-700"
                            : "inline-block px-4 py-2 rounded-md font-semibold transition-colors bg-gray-200 text-gray-400 cursor-not-allowed"
                        }
                        aria-disabled={!enabled}
                        onClick={(e) => {
                          if (!enabled) e.preventDefault();
                        }}
                      >
                        Open background checks
                      </Link>
                    </div>
                  </div>
                </div>
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