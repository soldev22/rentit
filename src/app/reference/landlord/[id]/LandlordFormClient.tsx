'use client';

import { useState } from 'react';

export default function LandlordFormClient(props: { appId: string; token: string; applicantName: string }) {
  const { appId, token, applicantName } = props;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="max-w-lg mx-auto mt-20 p-8 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Previous Landlord Reference</h2>
      <p className="mb-4 text-gray-700">
        Please provide a reference for <b>{applicantName}</b>.
      </p>

      {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setSubmitting(true);

          const form = e.currentTarget;
          const formData = new FormData(form);

          const payload = {
            wouldRentAgain: formData.get('wouldRentAgain') === 'yes',
            paidOnTime: formData.get('paidOnTime') === 'yes',
            arrears: formData.get('arrears') === 'yes',
            comments: String(formData.get('comments') || ''),
          };

          try {
            const res = await fetch(`/api/tenancy-applications/${appId}/landlord-reference?token=${encodeURIComponent(token)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (res.ok) {
              window.location.href = '/reference/thanks';
              return;
            }

            const data = await res.json().catch(() => null);
            setError(data?.error || 'Failed to submit');
          } catch {
            setError('Failed to submit');
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div>
          <label htmlFor="wouldRentAgain" className="block font-medium mb-1">Would you rent to the applicant again?</label>
          <select id="wouldRentAgain" title="Would rent again" name="wouldRentAgain" className="w-full border rounded p-2" defaultValue="" required>
            <option value="">Select…</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <div>
          <label htmlFor="paidOnTime" className="block font-medium mb-1">Did the applicant pay rent on time?</label>
          <select id="paidOnTime" title="Paid on time" name="paidOnTime" className="w-full border rounded p-2" defaultValue="" required>
            <option value="">Select…</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <div>
          <label htmlFor="arrears" className="block font-medium mb-1">Were there any arrears?</label>
          <select id="arrears" title="Arrears" name="arrears" className="w-full border rounded p-2" defaultValue="" required>
            <option value="">Select…</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <div>
          <label htmlFor="comments" className="block font-medium mb-1">Comments (optional)</label>
          <textarea id="comments" title="Comments" name="comments" placeholder="Any additional details" className="w-full border rounded p-2" />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
