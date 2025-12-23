import { test, expect } from '@playwright/test';
import { ensureLandlordAuth } from './helpers/auth';
import fs from 'fs';

// Create -> edit -> delete flow
test('landlord can create, edit, and delete property', async ({ page, context }) => {
  // Extend timeout for this flow which relies on network/API responses
  test.setTimeout(120000);
  // Skip if local dev server isn't running to avoid noisy failures
  async function serverIsUp(url = 'http://localhost:3000') {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      return res.ok || res.status === 200;
    } catch (err) {
      return false;
    }
  }

  if (!(await serverIsUp())) {
    test.skip(true, 'Local dev server not running at http://localhost:3000');
    return;
  }

  const { storagePath } = await ensureLandlordAuth(page);

  // Create a new context with the saved storage state and replace page/context for the test
  if (!storagePath) {
    throw new Error('ensureLandlordAuth did not provide a storagePath');
  }
  const browser = context.browser();
  if (!browser) {
    throw new Error('Browser instance not available from context');
  }
  const authContext = await browser.newContext({ storageState: storagePath });
  const authPage = await authContext.newPage();

  // Close the original page provided by the fixture
  await page.close();

  try {
    // Navigate to new property page
    await authPage.goto('http://localhost:3000/landlord/properties/new');

    // Verify the auth state loaded correctly in the new context: expect landlord-specific UI
    try {
      await expect(authPage.getByRole('link', { name: 'Landlord Dashboard' })).toBeVisible({ timeout: 5000 });
    } catch (e) {
      // Capture storage state for debugging and fail fast with a helpful message
      const tmpPath = `playwright/.auth/landlord-debug-${Date.now()}.json`;
      await authContext.storageState({ path: tmpPath });
      throw new Error(`Landlord auth not applied in new context; saved storage to ${tmpPath} for inspection`);
    }

    const unique = `E2E Property ${Date.now()}`;
await authPage.getByLabel('Title', { exact: true }).fill(unique);
  await authPage.getByLabel('Address line 1', { exact: true }).fill('10 Test Street');
  await authPage.getByLabel('City', { exact: true }).fill('Testville');
  await authPage.getByLabel('Postcode', { exact: true }).fill('TE5 1NG');

  // Wait for the rent input to be ready and fill directly by aria-label to avoid potential labelling ambiguity
  const rentInput = authPage.locator('input[aria-label="Rent"]');
  await rentInput.waitFor({ state: 'visible', timeout: 5000 });
  await rentInput.fill('950');

    // Click create and assert POST response is 201 and contains property
    const [createResp] = await Promise.all([
      authPage.waitForResponse((r) => r.url().includes('/api/landlord/properties') && r.request().method() === 'POST'),
      authPage.getByRole('button', { name: 'Create Draft Property' }).click(),
    ]);
    expect(createResp.status()).toBe(201);
    const createBody = await createResp.json();
    expect(createBody.property?.title).toBe(unique);

    // Should redirect back to landlord properties
    await authPage.waitForURL(/landlord\/properties/);

    // Find the created property card
    const created = authPage.getByText(unique).first();
    await expect(created).toBeVisible();

    // Open edit modal by clicking the card
    await created.click();

    // Wait for modal and change title
    const modalTitleInput = authPage.getByLabel('Title', { exact: true });
    await expect(modalTitleInput).toBeVisible();
    await modalTitleInput.fill(`${unique} Edited`);

    // Save changes and assert PUT response
    const [putResp] = await Promise.all([
      authPage.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes('/api/landlord/properties/')),
      authPage.getByRole('button', { name: 'Save changes' }).click(),
    ]);
    expect(putResp.status()).toBe(200);

    // Wait for reload and verify edited title
    await authPage.waitForTimeout(1000);
    await expect(authPage.getByText(`${unique} Edited`)).toBeVisible();

    // Open modal again and delete property
    await authPage.getByText(`${unique} Edited`).first().click();

    // Handle confirm dialog
    authPage.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Click Delete button in modal and assert DELETE response
    const [delResp] = await Promise.all([
      authPage.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('/api/landlord/properties/')),
      authPage.getByRole('button', { name: 'Delete' }).click(),
    ]);
    expect([200, 204]).toContain(delResp.status());

    // After deletion, verify the property is no longer present
    await authPage.waitForTimeout(1000);
    await expect(authPage.getByText(`${unique} Edited`).first()).toHaveCount(0);
  } finally {
    // Clean up the created context
    await authContext.close();
  }
});