import { getTenancyApplicationById, TenancyApplication } from '@/lib/tenancy-application';
import EmployerFormClient from './EmployerFormClient';

async function verifyEmployerToken(appId: string, token?: string): Promise<TenancyApplication | null> {
  if (!token) return null;
  const doc = await getTenancyApplicationById(appId);
  if (!doc) return null;
  const app = doc as TenancyApplication;
  const verifier = app.stage2?.employerVerification;
  if (!verifier?.token || verifier.token !== token) return null;
  if (verifier.tokenUsed) return null;
  if (verifier.tokenExpiresAt && new Date(verifier.tokenExpiresAt) < new Date()) return null;
  return app;
}

export default async function EmployerReferencePage(props: {
  params: { id: string } | Promise<{ id: string }>;
  searchParams: { token?: string } | Promise<{ token?: string }>;
}) {
  const params = props.params instanceof Promise ? await props.params : props.params;
  const searchParams = props.searchParams instanceof Promise ? await props.searchParams : props.searchParams;
  const { id } = params;
  const { token } = searchParams;

  const application = await verifyEmployerToken(id, token);
  if (!application) {
    return (
      <div className="max-w-lg mx-auto mt-20 p-8 bg-white rounded shadow text-center">
        <h2 className="text-2xl font-bold mb-4 text-red-700">Invalid or expired link</h2>
        <p className="text-gray-600">This employer verification link is invalid, expired, or already used.</p>
      </div>
    );
  }

  return <EmployerFormClient appId={id} token={token ?? ''} applicantName={application.applicantName} />;
}
