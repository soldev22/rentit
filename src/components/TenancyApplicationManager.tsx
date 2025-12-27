"use client";

import { useState } from 'react';
import { TenancyApplication } from '@/lib/tenancy-application';

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
  const [loading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Helper to get stage status
  const getStageStatus = (stageNumber: number) => {
    const stageKey = `stage${stageNumber}`;
    return currentApplication[stageKey]?.status || 'pending';
  };

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
    if (viewingDetails?.date) {
      // Ensure date is in yyyy-mm-dd format for input type="date"
      const d = new Date(viewingDetails.date);
      if (!isNaN(d.getTime())) {
        setViewingDate(d.toISOString().split('T')[0]);
      } else {
        setViewingDate(viewingDetails.date);
      }
    } else {
      setViewingDate('');
    }
    if (viewingDetails?.time) {
      setViewingTime(viewingDetails.time);
    } else {
      setViewingTime('');
    }
    setViewingModalOpen(true);
  };
  const [viewingLoading, setViewingLoading] = useState(false);
  const [viewingError, setViewingError] = useState<string | null>(null);

  // Show viewing details if scheduled
  const viewingDetails = currentApplication.stage1?.viewingDetails;

  // Stage 1 controls: allow rescheduling and resending notification
  const renderStage1Controls = () => (
    <div>
      {viewingDetails && (
        <div className="p-4 bg-green-50 border border-green-200 rounded mb-2">
          <div className="font-medium text-green-800 mb-1">Viewing Scheduled</div>
          <div className="text-sm text-gray-700">Date: {(() => {
            if (!viewingDetails.date) return '';
            const d = new Date(viewingDetails.date);
            if (isNaN(d.getTime())) return viewingDetails.date; // fallback
            return d.toLocaleDateString('en-GB');
          })()}</div>
          <div className="text-sm text-gray-700">Time: {viewingDetails.time}</div>
          <div className="text-sm text-gray-700">Notification sent to applicant.</div>
        </div>
      )}
      {(currentApplication.currentStage === 1 || viewingDetails) && (
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={handleOpenViewingModal}
        >
          {viewingDetails ? 'Reschedule / Resend Notification' : 'Schedule Viewing'}
        </button>
      )}

      {/* Modal for scheduling viewing: always render if open */}
      {viewingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">{viewingDetails ? 'Reschedule Viewing' : 'Schedule Viewing'}</h2>
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
                  {viewingLoading ? 'Sending...' : (viewingDetails ? 'Resend Notification' : 'Send Notification')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // Minimal stub for missing stage 3 controls to resolve ReferenceError
  const renderStage3Controls = () => <div />;

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
            const viewing = currentApplication.stage1?.viewingDetails;
            return (
              <div
                key={stage.number}
                className="rounded-lg border-2 p-4 shadow-sm flex flex-col justify-between border-green-400 bg-green-50"
              >
                <div>
                  <h4 className="text-lg font-semibold mb-1">Stage 1: {stage.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{stage.description}</p>
                  {viewing ? (
                    <div className="text-xs text-green-800 mb-1">
                      Viewing Agreed: {viewing.date ? new Date(viewing.date).toLocaleDateString('en-GB') : ''} at {viewing.time}
                    </div>
                  ) : (
                    <div className="text-xs text-yellow-800 mb-1">No viewing scheduled yet.</div>
                  )}
                  <span className="inline-block px-2 py-1 rounded text-xs font-medium mb-2 bg-green-200 text-green-800">
                    {viewing ? 'AGREED' : 'NOT SCHEDULED'}
                  </span>
                </div>
                <button
                  className="mt-2 px-4 py-2 rounded-md font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleOpenViewingModal}
                >
                  {viewing ? 'Edit / Resend Notification' : 'Schedule Viewing'}
                </button>
              </div>
            );
          }

          // Stage 2: enabled if currentApplication.stage2?.enabled
          if (stage.number === 2) {
            const enabled = !!currentApplication.stage2?.enabled;
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
          message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message}
        </div>
      )}
    </div>
  );

  // (the rest of your renderStage2Controls function continues here, unchanged)

  const renderStage4Controls = () => {
    const stageData = currentApplication.stage4;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Online Signature</h4>
            <p className="text-sm text-gray-600 mb-2">
              {stageData.onlineSignature ? 'Received' : 'Pending'}
            </p>
            {stageData.onlineSignature && (
              <p className="text-xs text-gray-500">
                Signed: {new Date(stageData.onlineSignature.signedAt).toLocaleDateString('en-GB')}
              </p>
            )}
          </div>

          <div>
            <h4 className="font-medium mb-2">Physical Signature</h4>
            <p className="text-sm text-gray-600 mb-2">
              {stageData.physicalSignatureReceived ? 'Received' : 'Pending'}
            </p>
            {stageData.physicalSignatureReceived && (
              <p className="text-xs text-gray-500">
                Received: {new Date(stageData.physicalSignatureReceived).toLocaleDateString('en-GB')}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleStageUpdate(4, { status: 'signed_online' })}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Mark Online Signature Received
          </button>
          <button
            onClick={() => handleStageUpdate(4, { status: 'signed_physical' })}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Mark Physical Signature Received
          </button>
          <button
            onClick={() => handleStageUpdate(4, { status: 'completed' })}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Mark Signing Complete
          </button>
        </div>
      </div>
    );
  };

  const renderStage5Controls = () => {
    const stageData = currentApplication.stage5;
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Move-in Date</label>
          <input
            type="date"
            value={stageData.moveInDate || ''}
            onChange={(e) => handleStageUpdate(5, { moveInDate: e.target.value })}
            className="w-full p-2 border rounded-md"
            aria-label="Move-in Date"
            disabled={loading}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <button
          onClick={() => handleStageUpdate(5, { status: 'confirmed' })}
          disabled={loading || !stageData.moveInDate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Confirm Move-in Date
        </button>
      </div>
    );
  };

  const renderStage6Controls = () => {
    const stageData = currentApplication.stage6;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={stageData.inventoryCompleted}
              onChange={(e) => handleStageUpdate(6, { inventoryCompleted: e.target.checked })}
              disabled={loading}
            />
            <span>Inventory Completed</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={stageData.finalDocumentsSent}
              onChange={(e) => handleStageUpdate(6, { finalDocumentsSent: e.target.checked })}
              disabled={loading}
            />
            <span>Final Documents Sent</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={stageData.keysHandedOver}
              onChange={(e) => handleStageUpdate(6, { keysHandedOver: e.target.checked })}
              disabled={loading}
            />
            <span>Keys Handed Over</span>
          </label>
        </div>

        <button
          onClick={() => handleStageUpdate(6, { status: 'completed' })}
          disabled={loading || !stageData.inventoryCompleted || !stageData.finalDocumentsSent || !stageData.keysHandedOver}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          Complete Tenancy Setup
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
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
              // Optionally redirect or update UI
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
      {/* Debug Info removed */}
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

      {/* Progress Indicator */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Progress</h3>
        <div className="space-y-4">
          {stages.map((stage) => {
            const status = getStageStatus(stage.number);
            return (
              <div key={stage.number} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <h4 className="font-medium">Stage {stage.number}: {stage.name}</h4>
                  <p className="text-sm text-gray-600">{stage.description}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  status === 'completed' ? 'bg-green-100 text-green-800' :
                  status === 'agreed' ? 'bg-blue-100 text-blue-800' :
                  status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {status}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Stage Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">
          Stage {currentApplication.currentStage} Controls
        </h3>


        {currentApplication.currentStage === 1 && renderStage1Controls()}
        {currentApplication.currentStage === 2 && renderStage2Controls()}
        {currentApplication.currentStage === 3 && renderStage3Controls()}
        {currentApplication.currentStage === 4 && renderStage4Controls()}
        {currentApplication.currentStage === 5 && renderStage5Controls()}
        {currentApplication.currentStage === 6 && renderStage6Controls()}

        {currentApplication.currentStage > 6 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">✅</div>
            <h4 className="text-lg font-semibold mb-2">Application Complete!</h4>
            <p className="text-gray-600">This tenancy application has been fully processed.</p>
          </div>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}