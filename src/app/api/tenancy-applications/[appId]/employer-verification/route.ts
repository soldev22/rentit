import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getTenancyApplicationById, updateTenancyApplication } from '@/lib/tenancy-application';

export async function POST(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
  const { appId } = await context.params;
  if (!ObjectId.isValid(appId)) {
    return NextResponse.json({ error: 'Invalid application ID' }, { status: 400 });
  }

  const application = await getTenancyApplicationById(appId);
  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const verifier = application.stage2?.employerVerification;

  if (!token || verifier?.token !== token) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });
  }
  if (verifier?.tokenUsed) {
    return NextResponse.json({ error: 'Token already used' }, { status: 403 });
  }
  if (verifier?.tokenExpiresAt && new Date(verifier.tokenExpiresAt) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        employed?: boolean;
        nonZeroHoursContract?: boolean;
        contractType?: string;
        startDate?: string;
        comments?: string;
      }
    | null;

  const response = {
    employed: body?.employed === true,
    nonZeroHoursContract: body?.nonZeroHoursContract === true,
    contractType: typeof body?.contractType === 'string' ? body.contractType.slice(0, 100) : undefined,
    startDate: typeof body?.startDate === 'string' ? body.startDate.slice(0, 50) : undefined,
    comments: typeof body?.comments === 'string' ? body.comments.trim().slice(0, 2000) : undefined,
    submittedAt: new Date().toISOString(),
  };

  await updateTenancyApplication(appId, {
    stage2: {
      ...application.stage2,
      employerVerification: {
        ...verifier,
        status: 'received',
        tokenUsed: true,
        response,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
