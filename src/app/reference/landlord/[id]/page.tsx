import { getTenancyApplicationById, TenancyApplication } from '@/lib/tenancy-application';
import LandlordFormClient from './LandlordFormClient';

async function verifyLandlordToken(appId: string, token?: string): Promise<TenancyApplication | null> {
  if (!token) return null;
  const doc = await getTenancyApplicationById(appId);
  if (!doc) return null;
  const app = doc as TenancyApplication;
  const reference = app.stage2?.previousLandlordReference;
  if (!reference?.token || reference.token !== token) return null;
  if (reference.tokenUsed) return null;
  if (reference.tokenExpiresAt && new Date(reference.tokenExpiresAt) < new Date()) return null;
  return app;
}

export default async function PreviousLandlordReferencePage(props: {
  params: { id: string } | Promise<{ id: string }>;
  searchParams: { token?: string } | Promise<{ token?: string }>;
}) {
  const params = props.params instanceof Promise ? await props.params : props.params;
  const searchParams = props.searchParams instanceof Promise ? await props.searchParams : props.searchParams;
  const { id } = params;
  const { token } = searchParams;

  const application = await verifyLandlordToken(id, token);
  if (!application) {
    return (
      <div className="max-w-lg mx-auto mt-20 p-8 bg-white rounded shadow text-center">
        <h2 className="text-2xl font-bold mb-4 text-red-700">Invalid or expired link</h2>
        <p className="text-gray-600">This landlord reference link is invalid, expired, or already used.</p>
      </div>
    );
  }

  return <LandlordFormClient appId={id} token={token ?? ''} applicantName={application.applicantName} />;
}
