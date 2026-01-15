import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getTenancyApplicationById } from '@/lib/tenancy-application';
import CoTenantClient from './co-tenant-client';

export const dynamic = 'force-dynamic';

export default async function AddCoTenantPage(props: {
  params: { appId: string } | Promise<{ appId: string }>;
}) {
  const params = props.params instanceof Promise ? await props.params : props.params;
  const { appId } = params;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/application/co-tenant/${appId}`)}`);
  }

  if (session.user.role !== 'APPLICANT' || !session.user.id) {
    redirect('/dashboard');
  }

  if (!ObjectId.isValid(appId)) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">Invalid application ID</div>
      </main>
    );
  }

  const application = await getTenancyApplicationById(appId);
  if (!application) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">Application not found</div>
      </main>
    );
  }

  if (!application.applicantId || application.applicantId.toString() !== session.user.id) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">Forbidden</div>
      </main>
    );
  }

  const viewingAgreed = application.stage1?.status === 'agreed';

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Add a co-tenant</h1>
        <p className="text-sm text-slate-600">A tenancy can have up to 2 signatories (you + 1 co-tenant).</p>
      </header>

      <div className="flex items-center justify-between">
        <Link className="text-sm font-medium text-blue-700 hover:underline" href="/applicant/dashboard">
          Back to dashboard
        </Link>
        <div className="text-sm text-slate-600">
          Viewing: <span className={viewingAgreed ? 'text-green-700 font-semibold' : 'text-amber-700 font-semibold'}>{viewingAgreed ? 'Agreed' : 'Not agreed'}</span>
        </div>
      </div>

      <CoTenantClient
        appId={appId}
        viewingAgreed={viewingAgreed}
        existingCoTenant={application.coTenant ? { name: application.coTenant.name, email: application.coTenant.email, tel: application.coTenant.tel } : null}
      />
    </main>
  );
}
