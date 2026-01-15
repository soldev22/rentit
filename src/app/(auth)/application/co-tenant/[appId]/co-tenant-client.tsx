'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type Props = {
  appId: string;
  existingCoTenant?: { name: string; email: string; tel: string } | null;
  viewingAgreed: boolean;
};

export default function CoTenantClient({ appId, existingCoTenant, viewingAgreed }: Props) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');

  const [creditCheck, setCreditCheck] = useState(false);
  const [socialMedia, setSocialMedia] = useState(false);
  const [landlordReference, setLandlordReference] = useState(false);
  const [employerReference, setEmployerReference] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const allConsented = useMemo(
    () => creditCheck && socialMedia && landlordReference && employerReference,
    [creditCheck, socialMedia, landlordReference, employerReference]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!viewingAgreed) {
      setError('You can only add a co-tenant after the viewing has been agreed.');
      return;
    }

    if (existingCoTenant) {
      setError('A co-tenant has already been added (max 2 signatories).');
      return;
    }

    if (!allConsented) {
      setError('All consents are required to add a co-tenant.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/tenancy-applications/${appId}/co-tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          tel,
          consents: {
            creditCheck,
            socialMedia,
            landlordReference,
            employerReference,
          },
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Failed to add co-tenant');
        return;
      }

      setSuccess('Co-tenant added successfully.');
      router.refresh();
      setTimeout(() => router.push('/applicant/dashboard'), 800);
    } catch {
      setError('Failed to add co-tenant');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {existingCoTenant ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">Co-tenant already added</div>
          <div className="mt-2 text-sm text-slate-700">
            <div><span className="font-medium">Name:</span> {existingCoTenant.name}</div>
            <div><span className="font-medium">Email:</span> {existingCoTenant.email}</div>
            <div><span className="font-medium">Phone:</span> {existingCoTenant.tel}</div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</div>
      ) : null}

      <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
        <div>
          <label htmlFor="coTenantName" className="block text-sm font-medium text-slate-700 mb-1">Co-tenant name</label>
          <input
            id="coTenantName"
            className="w-full rounded border border-slate-300 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={!!existingCoTenant}
          />
        </div>

        <div>
          <label htmlFor="coTenantEmail" className="block text-sm font-medium text-slate-700 mb-1">Co-tenant email</label>
          <input
            id="coTenantEmail"
            type="email"
            className="w-full rounded border border-slate-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!!existingCoTenant}
          />
        </div>

        <div>
          <label htmlFor="coTenantTel" className="block text-sm font-medium text-slate-700 mb-1">Co-tenant phone</label>
          <input
            id="coTenantTel"
            className="w-full rounded border border-slate-300 px-3 py-2"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
            required
            disabled={!!existingCoTenant}
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-900 mb-2">Required consents</div>
          <div className="space-y-2 text-sm text-slate-700">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={creditCheck} onChange={(e) => setCreditCheck(e.target.checked)} disabled={!!existingCoTenant} />
              <span>Credit check consent</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={socialMedia} onChange={(e) => setSocialMedia(e.target.checked)} disabled={!!existingCoTenant} />
              <span>Social media check consent</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={landlordReference} onChange={(e) => setLandlordReference(e.target.checked)} disabled={!!existingCoTenant} />
              <span>Previous landlord reference consent</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={employerReference} onChange={(e) => setEmployerReference(e.target.checked)} disabled={!!existingCoTenant} />
              <span>Employer reference consent</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !!existingCoTenant}
          className="inline-flex items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Adding…' : 'Add co-tenant'}
        </button>
      </form>
    </div>
  );
}
