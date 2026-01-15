import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ObjectId } from 'mongodb';
import { getTenancyApplicationById, updateTenancyApplication } from '@/lib/tenancy-application';
import { withApiAudit } from '@/lib/api/withApiAudit';
import type { TenancyApplication } from '@/lib/tenancy-application';
import { getCollection } from '@/lib/db';
import { DEFAULT_LANDLORD_BACKGROUND_CHECK_CRITERIA } from '@/lib/landlordBackgroundCheckCriteria';

type CreditCheckBody = {
  experianScore: number;
  ccjCount: number;
  reportUrl?: string;
};

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

  // Use landlord-configured criteria when deciding PASS/FAIL.
  const criteriaCollection = await getCollection('landlord_background_check_criteria');
  const criteriaDoc = await criteriaCollection.findOne({ landlordId: application.landlordId });
  const creditCriteria =
    (criteriaDoc as any)?.criteria?.credit ?? DEFAULT_LANDLORD_BACKGROUND_CHECK_CRITERIA.credit;
  const minExperianScore = Number(creditCriteria?.minExperianScore);
  const maxCcjs = Number(creditCriteria?.maxCcjs);
  const minScore = Number.isFinite(minExperianScore)
    ? minExperianScore
    : DEFAULT_LANDLORD_BACKGROUND_CHECK_CRITERIA.credit.minExperianScore;
  const maxAllowedCcjs = Number.isFinite(maxCcjs)
    ? maxCcjs
    : DEFAULT_LANDLORD_BACKGROUND_CHECK_CRITERIA.credit.maxCcjs;

  const url = new URL(req.url);
  const partyRaw = url.searchParams.get('party');
  const party: 'primary' | 'coTenant' = partyRaw === 'coTenant' ? 'coTenant' : 'primary';
  if (party === 'coTenant' && !application.coTenant) {
    return NextResponse.json({ error: 'No co-tenant has been added to this application.' }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Partial<CreditCheckBody> | null;
  const experianScore = Number(body?.experianScore);
  const ccjCount = Number(body?.ccjCount);
  const reportUrl = typeof body?.reportUrl === 'string' ? body.reportUrl.trim().slice(0, 1000) : undefined;

  if (!Number.isFinite(experianScore) || !Number.isFinite(ccjCount) || experianScore < 0 || ccjCount < 0) {
    return NextResponse.json({ error: 'Invalid experianScore or ccjCount' }, { status: 400 });
  }

  const passed = experianScore >= minScore && ccjCount <= maxAllowedCcjs;
  const failureReason = !passed
    ? experianScore < minScore
      ? `Experian score below ${minScore}`
      : `Too many CCJs (>= ${maxAllowedCcjs + 1})`
    : undefined;

  const checkedAt = new Date().toISOString();

  const creditCheckStatus: TenancyApplication['stage2']['creditCheck']['status'] = passed
    ? 'completed'
    : 'failed';

  const defaultCreditCheck: TenancyApplication['stage2']['creditCheck'] = {
    status: 'not_started',
  };

  const defaultCoTenantStage2: NonNullable<TenancyApplication['stage2']['coTenant']> = {
    status: 'agreed',
    creditCheckConsent: false,
    socialMediaConsent: false,
    landlordReferenceConsent: false,
    employerReferenceConsent: false,
    creditCheck: defaultCreditCheck,
  };

  const updatedStage2 = {
    ...application.stage2,
    ...(party === 'primary'
      ? {
          creditCheck: {
            ...(application.stage2.creditCheck ?? defaultCreditCheck),
            status: creditCheckStatus,
            score: experianScore,
            ccjCount,
            passed,
            failureReason,
            reportUrl,
            checkedAt,
          },
        }
      : {
          coTenant: {
            ...(application.stage2?.coTenant ?? defaultCoTenantStage2),
            creditCheck: {
              ...(application.stage2?.coTenant?.creditCheck ?? defaultCreditCheck),
              status: creditCheckStatus,
              score: experianScore,
              ccjCount,
              passed,
              failureReason,
              reportUrl,
              checkedAt,
            },
          },
        }),
  };

  const coTenantFailed = application.coTenant
    ? updatedStage2.coTenant?.creditCheck?.passed === false || updatedStage2.coTenant?.creditCheck?.status === 'failed'
    : false;
  const primaryFailed = updatedStage2.creditCheck?.passed === false || updatedStage2.creditCheck?.status === 'failed';
  const anyFailed = primaryFailed || coTenantFailed;

  // If we previously auto-set the application to rejected due to a failed credit check,
  // allow it to recover when both parties pass.
  const nextStatus: TenancyApplication['status'] = anyFailed
    ? 'rejected'
    : application.status === 'rejected'
      ? 'in_progress'
      : application.status;

  await updateTenancyApplication(appId, {
    stage2: updatedStage2,
    status: nextStatus,
  });

  return NextResponse.json({ ok: true, passed, failureReason, party });
}

export const POST = withApiAudit(submitCreditCheck);
