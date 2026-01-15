import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { sendViewingNotification } from '@/lib/notifications';
import type { Property, Landlord } from '@/lib/notifications';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { withApiAudit } from '@/lib/api/withApiAudit';

async function scheduleViewing(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'LANDLORD') {
    return NextResponse.json({ error: 'Only landlords can schedule viewings' }, { status: 403 });
  }

  const { appId } = await context.params;
  if (!ObjectId.isValid(appId)) {
    return NextResponse.json({ error: 'Invalid application ID' }, { status: 400 });
  }
  const { date, time, note } = await req.json();
  if (!date || !time) {
    return NextResponse.json({ error: 'Date and time are required' }, { status: 400 });
  }

  const safeNote = typeof note === 'string' ? note.trim().slice(0, 500) : undefined;

  // Guard rail: prevent scheduling viewings in the past.
  // `date` is expected as YYYY-MM-DD from <input type="date" />.
  const requestedDate = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(requestedDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }
  const todayUtc = new Date();
  const todayStartUtc = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate()));
  if (requestedDate < todayStartUtc) {
    return NextResponse.json({ error: 'Viewing date cannot be in the past' }, { status: 400 });
  }

  const collection = await getCollection('tenancy_applications');
  const app = await collection.findOne({ _id: new ObjectId(appId) });
  if (!app) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const landlordIdUnknown = (app as { landlordId?: unknown }).landlordId;
  const landlordObjectId =
    landlordIdUnknown instanceof ObjectId
      ? landlordIdUnknown
      : typeof landlordIdUnknown === 'string' && ObjectId.isValid(landlordIdUnknown)
        ? new ObjectId(landlordIdUnknown)
        : null;

  if (!landlordObjectId || landlordObjectId.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Update stage1.viewingDetails and progress to stage 2.
  // NOTE: The app schema does not include `enabled` flags, so we avoid adding them.
  const stage2IfMissing = {
    status: 'pending',
    creditCheckConsent: false,
    socialMediaConsent: false,
    landlordReferenceConsent: false,
    employerReferenceConsent: false,
    creditCheck: { status: 'not_started' },
  };

  await collection.updateOne(
    { _id: new ObjectId(appId) },
    {
      $set: {
        'stage1.viewingDetails': { date, time, ...(safeNote ? { note: safeNote } : {}) },
        'stage1.status': 'agreed',
        'stage1.agreedAt': new Date().toISOString(),
        currentStage: Math.max(Number(app.currentStage ?? 1), 2),
        stage2: app.stage2 ?? stage2IfMissing,
      },
    }
  );
  // Fetch property details for address
  let property: Property | undefined = undefined;
  let landlord: Landlord | undefined = undefined;
  if (app.propertyId) {
    const properties = await getCollection('properties');
    const foundProperty = await properties.findOne({ _id: new ObjectId(app.propertyId) });
    if (foundProperty) {
      property = foundProperty as Property;
      const landlordIdUnknown = (foundProperty as { landlordId?: unknown }).landlordId;
      const landlordObjectId =
        landlordIdUnknown instanceof ObjectId
          ? landlordIdUnknown
          : typeof landlordIdUnknown === 'string' && ObjectId.isValid(landlordIdUnknown)
            ? new ObjectId(landlordIdUnknown)
            : null;

      if (landlordObjectId) {
        const users = await getCollection('users');
        const foundLandlord = await users.findOne({ _id: landlordObjectId });
        if (foundLandlord) landlord = foundLandlord as Landlord;
      }
    }
  }
  // Send notification (email/SMS)
  let notificationResult: unknown = undefined;
  try {
    // Convert app (WithId<Document>) to ViewingApplication shape for notification
    const notificationApp = {
      applicantEmail: app.applicantEmail,
      email: app.email,
      userEmail: app.userEmail,
      applicant: app.applicant,
      applicantName: app.applicantName,
      applicantTel: app.applicantTel,
      phone: app.phone,
      userPhone: app.userPhone,
    };
    notificationResult = await sendViewingNotification(notificationApp, { date, time, note: safeNote, property, landlord });
  } catch (e) {
    // Log but don't fail the request
    console.error('Notification error', e);
    notificationResult = { error: 'Notification threw an exception' };
  }
  return NextResponse.json({ ok: true, notification: notificationResult });
}

export const POST = withApiAudit(scheduleViewing, {
  action: 'VIEWING_SCHEDULED',
  description: () => 'Viewing scheduled',
});
