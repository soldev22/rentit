import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mocks
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
import { ObjectId } from 'mongodb';

describe('PUT /api/landlord/properties/[id]', () => {
  beforeEach(() => {
    (getServerSession as any).mockReset();
    (getCollection as any).mockReset();
  });

  it('returns 401 when unauthenticated or not landlord', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const req = new Request('http://localhost/api/landlord/properties/507f1f77bcf86cd799439011', { method: 'PUT' });
    const res = await PUT(req as any, { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) } as any);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns updated property on successful update', async () => {
    const id = '694ba8cbfbd174c1b5179d93';
    // Session as landlord
    (getServerSession as any).mockResolvedValue({ user: { id: '69497e8870380dda2c61ba7f', role: 'LANDLORD' } });

    // Mock collection: updateOne returns matched/modified, findOne returns the updated doc
    const mockUpdateOne = vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const updatedDoc = {
      _id: new ObjectId(id),
      title: 'Edited Title',
      deposit: 350,
      viewingInstructions: 'Call ahead to arrange access',
      rentPcm: 950,
      address: { line1: '10 Test Street', city: 'Testville', postcode: 'TE5 1NG' },
      status: 'draft',
      photos: [],
      createdAt: new Date().toISOString(),
    };
    const mockFindOne = vi.fn().mockResolvedValue(updatedDoc);
    (getCollection as any).mockResolvedValue({ updateOne: mockUpdateOne, findOne: mockFindOne });

    const payload = { title: 'Edited Title', deposit: 350, viewingInstructions: 'Call ahead to arrange access' };
    const req = new Request(`http://localhost/api/landlord/properties/${id}`, { method: 'PUT', body: JSON.stringify(payload), headers: { 'content-type': 'application/json' } });

    const res = await PUT(req as any, { params: Promise.resolve({ id }) } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.property).toBeTruthy();
    expect(body.property.deposit).toBe(350);
    expect(body.property.viewingInstructions).toBe('Call ahead to arrange access');
    expect(mockUpdateOne).toHaveBeenCalled();
    expect(mockFindOne).toHaveBeenCalled();
  });
});