import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ObjectId } from 'mongodb';
import { getTenancyApplicationById, updateTenancyApplication } from '@/lib/tenancy-application';
import { withApiAudit } from '@/lib/api/withApiAudit';

type CreditCheckBody = {
  experianScore: number;
  ccjCount: number;
  reportUrl?: string;
};

const MIN_EXPERIAN_SCORE = 750;
const MAX_CCJS = 1;

async function submitCreditCheck(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'LANDLORD') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { appId } = await context.params;
  if (!ObjectId.isValid(appId)) {
    return NextResponse.json({ error: 'Invalid application ID' }, { status: 400 });
  }

  const application = await getTenancyApplicationById(appId);
  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  if (application.landlordId?.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Partial<CreditCheckBody> | null;
  const experianScore = Number(body?.experianScore);
  const ccjCount = Number(body?.ccjCount);
  const reportUrl = typeof body?.reportUrl === 'string' ? body.reportUrl.trim().slice(0, 1000) : undefined;

  if (!Number.isFinite(experianScore) || !Number.isFinite(ccjCount) || experianScore < 0 || ccjCount < 0) {
    return NextResponse.json({ error: 'Invalid experianScore or ccjCount' }, { status: 400 });
  }

  const passed = experianScore >= MIN_EXPERIAN_SCORE && ccjCount <= MAX_CCJS;
  const failureReason = !passed
    ? experianScore < MIN_EXPERIAN_SCORE
      ? `Experian score below ${MIN_EXPERIAN_SCORE}`
      : `Too many CCJs (>= ${MAX_CCJS + 1})`
    : undefined;

  await updateTenancyApplication(appId, {
    stage2: {
      ...application.stage2,
      creditCheck: {
        ...application.stage2.creditCheck,
        status: passed ? 'completed' : 'failed',
        score: experianScore,
        ccjCount,
        passed,
        failureReason,
        reportUrl,
        checkedAt: new Date().toISOString(),
      },
    },
    status: passed ? application.status : 'rejected',
  });

  return NextResponse.json({ ok: true, passed, failureReason });
}

export const POST = withApiAudit(submitCreditCheck);
