import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock getServerSession and getCollection
vi.mock('next-auth', async () => ({
  default: vi.fn(() => ({})),
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/db', async () => ({
  getCollection: vi.fn(),
}));

import { getServerSession } from 'next-auth';
import { getCollection } from '@/lib/db';
import { PUT } from './route';

describe('PUT /api/landlord/properties/update', () => {
  beforeEach(() => {
    (getServerSession as any).mockReset();
    (getCollection as any).mockReset();
  });

  it('returns 400 for invalid id', async () => {
    const req = new Request('http://localhost/api/landlord/properties/update?id=notanid', { method: 'PUT' });
    const res = await PUT(req as Request, {});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid property id/);
  });

  it('returns 401 if unauthenticated or not landlord', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const req = new Request('http://localhost/api/landlord/properties/update?id=507f1f77bcf86cd799439011', { method: 'PUT', body: JSON.stringify({ title: 'X' }), headers: { 'content-type': 'application/json' } });
    const res = await PUT(req as Request, {});
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid payload', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: '507f1f77bcf86cd799439011', role: 'LANDLORD' } });
    const req = new Request('http://localhost/api/landlord/properties/update?id=507f1f77bcf86cd799439011', { method: 'PUT', body: JSON.stringify({ rentPcm: -10 }), headers: { 'content-type': 'application/json' } });
    const res = await PUT(req as Request, {});
    expect(res.status).toBe(400);
  });

  it('returns 404 when property not found', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: '507f1f77bcf86cd799439011', role: 'LANDLORD' } });
    (getCollection as any).mockResolvedValue({ updateOne: vi.fn().mockResolvedValue({ matchedCount: 0 }) });

    const req = new Request('http://localhost/api/landlord/properties/update?id=507f1f77bcf86cd799439011', { method: 'PUT', body: JSON.stringify({ title: 'New' }), headers: { 'content-type': 'application/json' } });
    const res = await PUT(req as Request, {});
    expect(res.status).toBe(404);
  });

  it('updates property with valid payload', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: '507f1f77bcf86cd799439011', role: 'LANDLORD' } });
    (getCollection as any).mockResolvedValue({ updateOne: vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }) });

    const req = new Request('http://localhost/api/landlord/properties/update?id=507f1f77bcf86cd799439011', { method: 'PUT', body: JSON.stringify({ title: 'Updated', deposit: 200, amenities: ['balcony'] }), headers: { 'content-type': 'application/json' } });
    const res = await PUT(req as Request, {});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});