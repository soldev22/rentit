import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { sendViewingNotification } from '@/lib/notifications';
import type { Property, Landlord } from '@/lib/notifications';

export async function POST(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
  const { appId } = await context.params;
  if (!ObjectId.isValid(appId)) {
    return NextResponse.json({ error: 'Invalid application ID' }, { status: 400 });
  }
  const { date, time } = await req.json();
  if (!date || !time) {
    return NextResponse.json({ error: 'Date and time are required' }, { status: 400 });
  }
  const collection = await getCollection('tenancy_applications');
  const app = await collection.findOne({ _id: new ObjectId(appId) });
  if (!app) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }
  // Update stage1.viewingDetails and enable stage2 (ensure stage2 exists)
  await collection.updateOne(
    { _id: new ObjectId(appId) },
    [
      {
        $set: {
          'stage1.viewingDetails': { date, time },
          'stage1.status': 'agreed',
          'stage1.agreedAt': new Date().toISOString(),
          currentStage: 1,
          // If stage2 doesn't exist, create it with enabled true and default values
          stage2: {
            $cond: [
              { $ifNull: ['$stage2', false] },
              { $mergeObjects: ['$stage2', { enabled: true }] },
              { status: 'pending', enabled: true }
            ]
          }
        }
      }
    ]
  );
  // Fetch property details for address
  let property: Property | undefined = undefined;
  let landlord: Landlord | undefined = undefined;
  if (app.propertyId) {
    const properties = await getCollection('properties');
    const foundProperty = await properties.findOne({ _id: new ObjectId(app.propertyId) });
    if (foundProperty) {
      property = foundProperty as Property;
      if ((property as any).landlordId) {
        const users = await getCollection('users');
        const foundLandlord = await users.findOne({ _id: (property as any).landlordId });
        if (foundLandlord) landlord = foundLandlord as Landlord;
      }
    }
  }
  // Send notification (email/SMS)
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
    await sendViewingNotification(notificationApp, { date, time, property, landlord });
  } catch (e) {
    // Log but don't fail the request
    console.error('Notification error', e);
  }
  return NextResponse.json({ ok: true });
}
