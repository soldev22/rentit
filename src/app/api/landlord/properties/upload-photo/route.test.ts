import { vi, describe, it, expect, beforeEach } from 'vitest';

// Prevent mongodb module from throwing during import
vi.mock('@/lib/mongodb', async () => ({
  default: Promise.resolve({ db: () => ({ collection: () => ({}) }) }),
  __esModule: true,
}));

// Mock Azure container client to prevent env var throws during import
vi.mock('@/lib/azureBlob', async () => ({
  containerClient: {
    getBlockBlobClient: vi.fn().mockReturnValue({
      uploadData: vi.fn().mockResolvedValue({}),
      url: 'https://fake.blob/url'
    })
  }
}));

vi.mock('next-auth', async () => ({ default: vi.fn(() => ({})), getServerSession: vi.fn() }));

import { getServerSession } from 'next-auth';
import { POST } from './route';

describe('POST /api/landlord/properties/upload-photo', () => {
  beforeEach(() => {
    (getServerSession as any).mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const req = new Request('http://localhost', { method: 'POST' });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorised');
  });

  it('returns 400 when no file provided', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: '507f1', role: 'LANDLORD' } });
    const form = new FormData();
    const req = new Request('http://localhost', { method: 'POST', body: form });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('No file uploaded');
  });
});
