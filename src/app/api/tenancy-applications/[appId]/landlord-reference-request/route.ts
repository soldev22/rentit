import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import { getTenancyApplicationById, updateTenancyApplication } from '@/lib/tenancy-application';
import { notificationService } from '@/lib/notification';
import { getCollection } from '@/lib/db';
import { withApiAudit } from '@/lib/api/withApiAudit';

async function requestLandlordReference(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
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

  let referenceEmail = application.stage2?.referenceContacts?.prevLandlordEmail || application.stage2?.backgroundInfo?.prevLandlordEmail;
  if (!referenceEmail && application.applicantId) {
    const users = await getCollection('users');
    const user = await users.findOne(
      { _id: application.applicantId },
      { projection: { profile: 1 } }
    );
    const fromProfile = user?.profile?.backgroundCheck?.prevLandlordEmail;
    if (typeof fromProfile === 'string' && fromProfile.trim()) referenceEmail = fromProfile.trim();
  }

  if (!referenceEmail) {
    return NextResponse.json(
      { error: 'Missing previous landlord email. Add it on the applicant profile or in the application Stage 2 (Background Checks) reference contacts.' },
      { status: 400 }
    );
  }

  const token = crypto.randomBytes(32).toString('hex');
  const requestedAt = new Date().toISOString();
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await updateTenancyApplication(appId, {
    stage2: {
      ...application.stage2,
      previousLandlordReference: {
        status: 'requested',
        requestedAt,
        token,
        tokenUsed: false,
        tokenExpiresAt,
      },
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
  const link = `${baseUrl}/reference/landlord/${appId}?token=${encodeURIComponent(token)}`;

  const subject = 'Previous Landlord Reference Request';
  const message =
    `Hello,\n\n` +
    `Please provide a reference for a tenancy application by completing this secure form:\n\n` +
    `${link}\n\n` +
    `This link will expire in 7 days.\n` +
    `If you did not expect this request, you can ignore this email.\n\n` +
    `Thank you.\n`;

  const ok = await notificationService.sendNotification({ to: referenceEmail, subject, message, method: 'email' });

  return NextResponse.json({ ok: true, emailed: ok, to: referenceEmail, requestedAt, link });
}

export const POST = withApiAudit(requestLandlordReference);
