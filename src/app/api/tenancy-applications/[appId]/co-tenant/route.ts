import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getTenancyApplicationById, updateTenancyApplication } from '@/lib/tenancy-application';
import { withApiAudit } from '@/lib/api/withApiAudit';

type AddCoTenantBody = {
  name?: string;
  email?: string;
  tel?: string;
  consents?: {
    creditCheck?: boolean;
    socialMedia?: boolean;
    landlordReference?: boolean;
    employerReference?: boolean;
  };
};

async function addCoTenant(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'APPLICANT') {
    return NextResponse.json({ error: 'Only applicants can add a co-tenant' }, { status: 403 });
  }

  const { appId } = await context.params;
  if (!ObjectId.isValid(appId)) {
    return NextResponse.json({ error: 'Invalid application ID' }, { status: 400 });
  }

  const application = await getTenancyApplicationById(appId);
  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  if (!application.applicantId || application.applicantId.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (application.stage1?.status !== 'agreed') {
    return NextResponse.json(
      { error: 'You can only add a co-tenant after the viewing has been agreed.' },
      { status: 400 }
    );
  }

  if (application.coTenant) {
    return NextResponse.json({ error: 'A co-tenant has already been added (max 2 signatories).' }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as AddCoTenantBody | null;

  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 200) : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 320) : '';
  const tel = typeof body?.tel === 'string' ? body.tel.trim().slice(0, 50) : '';

  if (!name || !email || !tel) {
    return NextResponse.json({ error: 'Name, email, and phone are required.' }, { status: 400 });
  }

  if (email === application.applicantEmail?.toLowerCase()) {
    return NextResponse.json({ error: 'Co-tenant email must be different from the primary applicant email.' }, { status: 400 });
  }

  const consents = body?.consents;
  const hasAllConsents =
    consents?.creditCheck === true &&
    consents?.socialMedia === true &&
    consents?.landlordReference === true &&
    consents?.employerReference === true;

  if (!hasAllConsents) {
    return NextResponse.json(
      {
        error:
          'You must grant consent for Credit Check, Social Media, Landlord Reference, and Employer Reference for the co-tenant to be added.'
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  const nextStage2 = {
    ...application.stage2,
    coTenant: {
      status: 'agreed' as const,
      creditCheckConsent: true,
      socialMediaConsent: true,
      landlordReferenceConsent: true,
      employerReferenceConsent: true,
      agreedAt: now,
      creditCheck: { status: 'not_started' as const },
    },
  };

  const ok = await updateTenancyApplication(appId, {
    coTenant: { name, email, tel, addedAt: now },
    stage2: nextStage2,
  });

  if (!ok) {
    return NextResponse.json({ error: 'Failed to add co-tenant' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, coTenant: { name, email, tel } });
}

export const POST = withApiAudit(addCoTenant, {
  action: 'TENANCY_COTENANT_ADDED',
  description: () => 'Co-tenant added',
});
