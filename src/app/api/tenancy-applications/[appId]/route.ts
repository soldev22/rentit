import { getTenancyApplicationById } from '@/lib/tenancy-application';

export async function GET(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
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
import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function DELETE(req: NextRequest, context: { params: Promise<{ appId: string }> }) {
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
