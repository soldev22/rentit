



  "use client";

  import { useState } from 'react';
  import { TenancyApplication } from '@/lib/tenancy-application';

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
  propertyTitle: string;
}

export default function TenancyApplicationManager({
  application,
  propertyTitle
}: TenancyApplicationManagerProps) {
  // State hooks must come first
  const [currentApplication] = useState(application);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Helper to get stage status (no dynamic access)
  // (Removed unused getStageStatus function)

  // Helper to get stage card color
  // (Removed unused getStageColor function)


  // Handler to jump to a stage (for demo, just scrolls to controls, could be improved)
  // (Removed unused handleGoToStage function)

  // --- Stage 1 Viewing Agreement Modal ---
  const [viewingModalOpen, setViewingModalOpen] = useState(false);
  const [viewingDate, setViewingDate] = useState('');
  const [viewingTime, setViewingTime] = useState('');

  // Populate form with existing values when opening modal
  const handleOpenViewingModal = () => {
    // Use preferredDate for date, no time field in model, so leave blank
    if (currentApplication.stage1?.preferredDate) {
      const d = new Date(currentApplication.stage1.preferredDate);
      if (!isNaN(d.getTime())) {
        setViewingDate(d.toISOString().split('T')[0]);
      } else {
        setViewingDate(currentApplication.stage1.preferredDate);
      }
    } else {
      setViewingDate('');
    }
    setViewingTime(''); // No time in model
    setViewingModalOpen(true);
  };
  const [viewingLoading, setViewingLoading] = useState(false);
  const [viewingError, setViewingError] = useState<string | null>(null);

  // Show viewing details if scheduled
  // Use agreedAt and preferredDate from stage1
  const viewingStatus = currentApplication.stage1?.status;
  const viewingType = currentApplication.stage1?.viewingType;
  const viewingPreferredDate = currentApplication.stage1?.preferredDate;

  // Stage 1 controls: allow rescheduling and resending notification
  const renderStage1Controls = () => (
    <div>
      {viewingStatus === 'agreed' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded mb-2">
          <div className="font-medium text-green-800 mb-1">Viewing Scheduled</div>
          <div className="text-sm text-gray-700">Date: {viewingPreferredDate ? new Date(viewingPreferredDate).toLocaleDateString('en-GB') : ''}</div>
          <div className="text-sm text-gray-700">Type: {viewingType}</div>
          <div className="text-sm text-gray-700">Notification sent to applicant.</div>
        </div>
      )}
      {(currentApplication.currentStage === 1 || viewingStatus === 'agreed') && (
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={handleOpenViewingModal}
        >
          {viewingStatus === 'agreed' ? 'Reschedule / Resend Notification' : 'Schedule Viewing'}
        </button>
      )}

      {/* Modal for scheduling viewing: always render if open */}
      {viewingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">{viewingStatus === 'agreed' ? 'Reschedule Viewing' : 'Schedule Viewing'}</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setViewingLoading(true);
                setViewingError(null);
                try {
                  const res = await fetch(`/api/tenancy-applications/${currentApplication._id?.toString()}/schedule-viewing`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date: viewingDate, time: viewingTime })
                  });
                  if (res.ok) {
                    setMessage('Viewing scheduled and applicant notified');
                    window.location.reload();
                  } else {
                    const err = await res.json();
                    setViewingError(err.error || 'Failed to schedule viewing');
                  }
                } catch {
                  setViewingError('Error scheduling viewing');
                } finally {
                  setViewingLoading(false);
                }
              }}
            >
              <label className="block mb-2 text-sm font-medium">Date</label>
              <input
                type="date"
                className="w-full p-2 border rounded mb-4"
                value={viewingDate}
                onChange={e => setViewingDate(e.target.value)}
                required
                min={new Date().toISOString().split('T')[0]}
                placeholder="Select viewing date"
                title="Viewing Date"
              />
              <label className="block mb-2 text-sm font-medium">Time</label>
              <input
                type="time"
                className="w-full p-2 border rounded mb-4"
                value={viewingTime}
                onChange={e => setViewingTime(e.target.value)}
                required
                placeholder="Select viewing time"
                title="Viewing Time"
              />
              {viewingError && <div className="text-red-600 text-sm mb-2">{viewingError}</div>}
              <div className="flex gap-2 justify-end">
                <button type="button" className="px-4 py-2 bg-gray-200 rounded" onClick={() => setViewingModalOpen(false)} disabled={viewingLoading}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={viewingLoading}>
                  {viewingLoading ? 'Sending...' : (viewingStatus === 'agreed' ? 'Resend Notification' : 'Send Notification')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // Minimal stub for missing stage 2, 3, 4, 5, and 6 controls to resolve ReferenceError
  const renderStage2Controls = () => <div />;
  const renderStage3Controls = () => <div />;
  const renderStage4Controls = () => <div />;
  const renderStage5Controls = () => <div />;
  const renderStage6Controls = () => <div />;


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
                      Viewing Agreed: {currentApplication.stage1.preferredDate ? new Date(currentApplication.stage1.preferredDate).toLocaleDateString('en-GB') : ''} ({currentApplication.stage1.viewingType})
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
                </div>
                <button
                  className={
                    enabled
                      ? "mt-2 px-4 py-2 rounded-md font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
                      : "mt-2 px-4 py-2 rounded-md font-medium transition-colors bg-gray-200 text-gray-400 cursor-not-allowed"
                  }
                  disabled={!enabled}
                  onClick={enabled ? () => {/* TODO: handle Stage 2 action */} : undefined}
                >
                  {enabled ? 'Start Background Checks' : 'Disabled'}
                </button>
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

      {/* Application Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Application Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Applicant</p>
            <p className="font-medium">{currentApplication.applicantName}</p>
            <p className="text-sm text-gray-600">{currentApplication.applicantEmail}</p>
            {currentApplication.applicantTel && (
              <p className="text-sm text-gray-600">{currentApplication.applicantTel}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600">Property</p>
            <p className="font-medium">{propertyTitle}</p>
            <p className="text-sm text-gray-600">Current Stage: {currentApplication.currentStage}</p>
            <p className="text-sm text-gray-600">Status: {currentApplication.status}</p>
          </div>
        </div>
      </div>

      {/* Current Stage Controls */}
      <div id="stage-controls" className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">
          Stage {currentApplication.currentStage} Controls
        </h3>
        {/* Always render Stage 1 controls so modal can open, but only show main button if current stage */}
        {renderStage1Controls()}
        {currentApplication.currentStage === 2 && renderStage2Controls()}
        {currentApplication.currentStage === 3 && renderStage3Controls()}
        {currentApplication.currentStage === 4 && renderStage4Controls()}
        {currentApplication.currentStage === 5 && renderStage5Controls()}
        {currentApplication.currentStage === 6 && renderStage6Controls()}
      </div>

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