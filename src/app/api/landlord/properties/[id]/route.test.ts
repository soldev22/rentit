import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCollection } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  // Auth guard
  if (!session || session.user?.role !== 'LANDLORD') {
    return NextResponse.json(
      { error: 'Unauthorised' },
      { status: 401 }
    );
  }

  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: 'Invalid property ID' },
      { status: 400 }
    );
  }

  type UpdatePropertyBody = {
    title?: string;
    status?: string;
    rentPcm?: number;
    description?: string;
    address?: string;
    deposit?: number;
    amenities?: string[];
    virtualTourUrl?: string;
    viewingInstructions?: string;
  };

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // 🔒 Explicit whitelist (THIS WAS THE BUG)
  const {
    title,
    status,
    rentPcm,
    description,
    address,
    deposit,
    amenities,
    virtualTourUrl,
    viewingInstructions,
  } = body as UpdatePropertyBody;

  const properties = await getCollection('properties');

  const updateResult = await properties.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        title,
        status,
        rentPcm,
        description,
        address,
        deposit,
        amenities,
        virtualTourUrl,
        viewingInstructions,
        updatedAt: new Date(),
      },
    }
  );

  if (updateResult.matchedCount === 0) {
    return NextResponse.json(
      { error: 'Property not found' },
      { status: 404 }
    );
  }

  const updatedProperty = await properties.findOne({
    _id: new ObjectId(id),
  });

  return NextResponse.json({
    ok: true,
    property: {
      ...updatedProperty,
      _id: updatedProperty?._id.toString(),
    },
  });
}
