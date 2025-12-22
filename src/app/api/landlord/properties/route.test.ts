import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Prevent mongodb module from throwing during import
vi.mock('@/lib/mongodb', async () => ({
  default: Promise.resolve({ db: () => ({ collection: () => ({}) }) }),
  __esModule: true,
}));

// Mock next-auth module (provide default NextAuth and getServerSession)
vi.mock('next-auth', async () => {
  return {
    default: vi.fn(() => ({})),
    getServerSession: vi.fn(),
  };
});

// Mock our db helper
vi.mock('@/lib/db', async () => {
  return {
    getCollection: vi.fn(),
  };
});

import { getServerSession } from 'next-auth';
import { getCollection } from '@/lib/db';
import { POST } from './route';

describe('POST /api/landlord/properties', () => {
  beforeEach(() => {
    (getServerSession as any).mockReset();
    (getCollection as any).mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as any).mockResolvedValue(null);

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorised');
  });

  it('returns 403 when not landlord role', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'abc', role: 'TENANT' } });

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toMatch(/Only landlords/);
  });

  it('creates property with valid payload', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: '507f1f77bcf86cd799439011', role: 'LANDLORD' } });

    const inserted = { insertedId: 'mockedId' };
    (getCollection as any).mockResolvedValue({ insertOne: vi.fn().mockResolvedValue(inserted) });

    const payload = {
      title: 'Test prop',
      address: { line1: '1 Main St', city: 'Town', postcode: 'T1 1AA' },
      rentPcm: 1000,
      bedrooms: 2,
    };

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.property.title).toBe('Test prop');
    expect(body.property._id).toBe(inserted.insertedId);
  });

  it('returns 400 for invalid payload', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: '507f1', role: 'LANDLORD' } });
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ title: '', address: {}, rentPcm: -10 }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
  });
});
