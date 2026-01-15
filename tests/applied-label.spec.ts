import { test, expect } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';

const BASE_URL = 'http://localhost:3000';

async function serverIsUp(url = BASE_URL) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok || res.status === 200;
  } catch {
    return false;
  }
}

async function loginAsApplicant(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel('Email').fill('applicant@test.local');
  await page.getByLabel('Password').fill('pasta123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/(dashboard|applicant|tenant|landlord|admin)/);
}

test('applied badge persists on listing (regression test)', async ({ page }) => {
  test.setTimeout(120000);

  if (!(process.env.FORCE_E2E === '1') && !(await serverIsUp())) {
    test.skip(true, 'Local dev server not running at http://localhost:3000');
    return;
  }

  await loginAsApplicant(page);

  await page.goto(`${BASE_URL}/public/properties`);
  await expect(page.getByRole('heading', { name: 'Available Properties' })).toBeVisible();

  const none = await page.getByText('No properties currently listed.').count();
  if (none > 0) {
    test.skip(true, 'No public properties listed to test against');
    return;
  }

  const firstCard = page.locator('[data-testid^="property-card-"]').first();
  await expect(firstCard).toBeVisible();

  const testId = await firstCard.getAttribute('data-testid');
  if (!testId) throw new Error('Missing data-testid on property card');
  const propertyId = testId.replace('property-card-', '');
  if (!propertyId) throw new Error(`Could not parse property id from ${testId}`);

  // Ensure an application exists for this property via API (avoid UI wizard brittleness).
  const createResp = await page.request.post(`${BASE_URL}/api/tenancy-applications`, {
    data: {
      propertyId,
      applicantName: 'E2E Applicant',
      applicantEmail: 'applicant@test.local',
      applicantTel: '07000000000',
      applicantAddress: { line1: '1 Test Street', city: 'Testville', postcode: 'TE5 1NG' },
      viewingType: 'onsite',
      backgroundCheckConsents: {
        creditCheck: true,
        socialMedia: true,
        landlordReference: true,
        employerReference: true,
      },
      referenceContacts: {},
    },
  });

  const createdBody = await createResp.json().catch(() => null) as any;

  // If we hit a duplicate (409) or validation issue, we still want to find an existing application id.
  let applicationId: string | undefined = createdBody?.applicationId;
  if (!applicationId) {
    const meResp = await page.request.get(`${BASE_URL}/api/tenancy-applications/me`);
    const meBody = await meResp.json().catch(() => null) as any;
    const apps: any[] = Array.isArray(meBody?.applications) ? meBody.applications : [];

    const normalizeId = (v: any) => {
      if (!v) return null;
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && typeof v.$oid === 'string') return v.$oid;
      return null;
    };

    const match = apps.find((a) => normalizeId(a?.propertyId) === propertyId);
    applicationId = normalizeId(match?._id) || normalizeId(match?.id) || undefined;
  }

  if (!applicationId) {
    throw new Error(`Could not determine applicationId (create status ${createResp.status()})`);
  }

  // Make the test resistant to the exact brittleness we fixed:
  // if the app transitions away from draft/in_progress, the applied badge should NOT disappear.
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    test.skip(true, 'MONGODB_URI is not set; cannot validate status transition regression');
    return;
  }

  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();

  try {
    await db
      .collection('tenancy_applications')
      .updateOne(
        { _id: new ObjectId(applicationId) },
        { $set: { status: 'approved', updatedAt: new Date().toISOString() } }
      );

    // Reload listing and assert applied state is shown on the card.
    await page.goto(`${BASE_URL}/public/properties`);

    const card = page.locator(`[data-testid="property-card-${propertyId}"]`);
    await expect(card).toBeVisible();
    await expect(card.getByText('Property applied for')).toBeVisible();

    // The existing feature hides the apply CTA when applied.
    await expect(card.getByRole('button', { name: 'Apply for this property' })).toHaveCount(0);
  } finally {
    // Clean up to keep the DB tidy for repeated runs.
    await db.collection('tenancy_applications').deleteOne({ _id: new ObjectId(applicationId) });
    await client.close();
  }
});
