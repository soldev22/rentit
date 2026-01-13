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
  const reference = application.stage2?.previousLandlordReference;

  if (!token || reference?.token !== token) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });
  }
  if (reference?.tokenUsed) {
    return NextResponse.json({ error: 'Token already used' }, { status: 403 });
  }
  if (reference?.tokenExpiresAt && new Date(reference.tokenExpiresAt) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        wouldRentAgain?: boolean;
        paidOnTime?: boolean;
        arrears?: boolean;
        comments?: string;
      }
    | null;

  const response = {
    wouldRentAgain: body?.wouldRentAgain === true,
    paidOnTime: body?.paidOnTime === true,
    arrears: body?.arrears === true,
    comments: typeof body?.comments === 'string' ? body.comments.trim().slice(0, 2000) : undefined,
    submittedAt: new Date().toISOString(),
  };

  await updateTenancyApplication(appId, {
    stage2: {
      ...application.stage2,
      previousLandlordReference: {
        ...reference,
        status: 'received',
        tokenUsed: true,
        response,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
