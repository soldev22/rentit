import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ObjectId } from 'mongodb';
import { getTenancyApplicationById, updateTenancyApplication } from '@/lib/tenancy-application';
import { withApiAudit } from '@/lib/api/withApiAudit';

async function getApplication(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
  const { appId } = await context.params;
  if (!ObjectId.isValid(appId)) {
    return NextResponse.json({ error: 'Invalid application ID' }, { status: 400 });
  }
  const application = await getTenancyApplicationById(appId);
  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }
  return NextResponse.json({ application });
}

type PatchBody = {
  stage2?: {
    referenceContacts?: {
      employerEmail?: string;
      employerName?: string;
      previousEmployerEmail?: string;
      previousEmployerName?: string;
      prevLandlordName?: string;
      prevLandlordContact?: string;
      prevLandlordEmail?: string;
    };
  };
};

async function patchApplication(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
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

  const body = (await req.json().catch(() => null)) as PatchBody | null;
  const next = body?.stage2?.referenceContacts;
  if (!next) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const clean = (value: unknown) => (typeof value === 'string' ? value.trim().slice(0, 200) : undefined);
  const employerEmail = clean(next.employerEmail);
  const employerName = clean(next.employerName);
  const previousEmployerEmail = clean(next.previousEmployerEmail);
  const previousEmployerName = clean(next.previousEmployerName);
  const prevLandlordName = clean(next.prevLandlordName);
  const prevLandlordContact = clean(next.prevLandlordContact);
  const prevLandlordEmail = clean(next.prevLandlordEmail);

  await updateTenancyApplication(appId, {
    stage2: {
      ...application.stage2,
      referenceContacts: {
        ...(application.stage2?.referenceContacts || {}),
        employerEmail: employerEmail || application.stage2?.referenceContacts?.employerEmail,
        employerName: employerName || application.stage2?.referenceContacts?.employerName,
        previousEmployerEmail: previousEmployerEmail || application.stage2?.referenceContacts?.previousEmployerEmail,
        previousEmployerName: previousEmployerName || application.stage2?.referenceContacts?.previousEmployerName,
        prevLandlordName: prevLandlordName || application.stage2?.referenceContacts?.prevLandlordName,
        prevLandlordContact: prevLandlordContact || application.stage2?.referenceContacts?.prevLandlordContact,
        prevLandlordEmail: prevLandlordEmail || application.stage2?.referenceContacts?.prevLandlordEmail,
        updatedAt: new Date().toISOString(),
        source: 'landlord',
      },
    },
  });

  return NextResponse.json({ ok: true });
}

import { getCollection } from '@/lib/db';

async function deleteApplication(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
  const { appId } = await context.params;
  if (!ObjectId.isValid(appId)) {
    return NextResponse.json({ error: 'Invalid application ID' }, { status: 400 });
  }
  const collection = await getCollection('tenancy_applications');
  const result = await collection.deleteOne({ _id: new ObjectId(appId) });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

export const GET = withApiAudit(getApplication);
export const PATCH = withApiAudit(patchApplication);
export const DELETE = withApiAudit(deleteApplication);
