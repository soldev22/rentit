// MVP Tenant Pre-Qualification API Route
// --------------------------------------
// This route implements the MVP pre-qualification flow for tenants.
// It avoids CRA (Credit Reference Agency) integration by design and must remain easily replaceable.
// No logic duplication, no recalculation after save, no background jobs, no analytics/events.
// Do not rename fields or statuses. Do not refactor unrelated code.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCollection } from '@/lib/db';
import { evaluateTenantPreQualification } from '@/lib/prequalification-eval';
import { TenantPreQualification } from '@/types/tenant-prequalification';

export const dynamic = 'force-dynamic';

type TenantPreQualificationRequest = {
  tenantId: string;
  applicationId: string;
  monthlyIncome: number;
  rentAmount: number;
  employmentStatus: string;
  selfDeclaredAdverseCredit: boolean;
  consentGiven: boolean;
  consentTimestamp: string;
};

export async function POST(req: NextRequest) {
  // Validate request body
  let body: TenantPreQualificationRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Required fields
  const {
    tenantId,
    applicationId,
    monthlyIncome,
    rentAmount,
    employmentStatus,
    selfDeclaredAdverseCredit,
    consentGiven,
    consentTimestamp
  } = body;

  if (!tenantId || !applicationId || typeof monthlyIncome !== 'number' || typeof rentAmount !== 'number' ||
      typeof employmentStatus !== 'string' || typeof selfDeclaredAdverseCredit !== 'boolean' ||
      typeof consentGiven !== 'boolean' || !consentTimestamp) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
  }

  // Confirm authenticated tenant
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'TENANT' || session.user.id !== tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Confirm consentGiven === true
  if (!consentGiven) {
    return NextResponse.json({ error: 'Consent required' }, { status: 400 });
  }

  // Call the existing evaluation function (no logic duplication)
  const evalResult = evaluateTenantPreQualification({
    monthlyIncome,
    rentAmount,
    employmentStatus,
    selfDeclaredAdverseCredit
  });

  // Prepare document for persistence
  const now = new Date().toISOString();
  const preQualDoc: TenantPreQualification = {
    tenantId,
    applicationId,
    status: evalResult.status,
    affordability: {
      monthlyIncome,
      rentAmount,
      incomeToRentRatio: evalResult.incomeToRentRatio,
      employmentStatus
    },
    selfDeclaredAdverseCredit,
    consentGiven,
    consentTimestamp,
    createdAt: now,
    updatedAt: now
  };

  // Persist the result to MongoDB
  const preQuals = await getCollection('tenant_pre_qualifications');
  await preQuals.updateOne(
    { tenantId, applicationId },
    { $set: preQualDoc },
    { upsert: true }
  );

  // Return status only in the response
  return NextResponse.json({ status: evalResult.status });
}

