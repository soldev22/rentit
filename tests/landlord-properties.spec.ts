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
    } catch {
      return false;
    }
  }

  // Allow forcing the test to run in environments where HEAD check fails
  if (!(process.env.FORCE_E2E === '1') && !(await serverIsUp())) {
    test.skip(true, 'Local dev server not running at http://localhost:3000');
    return;
  }

  const { email, password } = await ensureLandlordAuth(page);

  // Create a fresh context and sign in there to ensure session cookies are present for API calls
  const browser = context.browser();
  if (!browser) {
    throw new Error('Browser instance not available from context');
  }
  const authContext = await browser.newContext();
  const authPage = await authContext.newPage();

  // If we don't have credentials from the helper, read the script output
  let creds = { email, password } as { email?: string; password?: string };
  if (!creds.email || !creds.password) {
    const infoPath = 'scripts/test-qa.json';
    if (fs.existsSync(infoPath)) {
      creds = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
    }
  }

  if (!creds.email || !creds.password) {
    throw new Error('No landlord credentials available to sign in in the new context');
  }

  // Sign in in the new auth context
  await authPage.goto('http://localhost:3000/login');
  await authPage.setViewportSize({ width: 1280, height: 1024 }); // Ensure modal fits
  await authPage.getByLabel('Email').fill(creds.email);
  await authPage.getByLabel('Password').fill(creds.password);
  await authPage.getByRole('button', { name: 'Sign in', exact: true }).click();
  await authPage.waitForURL(/(dashboard|applicant|tenant|landlord|admin)/, { timeout: 15000 });

  // Ensure we are actually signed in as a landlord (guard against wrong/expired creds)
  try {
    await expect(authPage.getByRole('link', { name: 'Landlord Dashboard' })).toBeVisible({ timeout: 5000 });
  } catch {
    const tmpPath = `playwright/.auth/landlord-debug-signin-${Date.now()}.json`;
    await authContext.storageState({ path: tmpPath });
    throw new Error(`Sign in in the new context did not yield landlord role; saved storage to ${tmpPath}`);
  }

  // Close the original page provided by the fixture
  await page.close();

  try {
    // Navigate to new property page
    console.info('DEBUG: Navigating to new property page');
    await authPage.goto('http://localhost:3000/landlord/properties/new');
    await authPage.screenshot({ path: `test-results/debug-newpage-${Date.now()}.png` });

    // Verify the auth state loaded correctly in the new context: expect landlord-specific UI
    try {
      await expect(authPage.getByRole('link', { name: 'Landlord Dashboard' })).toBeVisible({ timeout: 5000 });
    } catch {
      // Capture storage state for debugging and fail fast with a helpful message
      const tmpPath = `playwright/.auth/landlord-debug-${Date.now()}.json`;
      await authContext.storageState({ path: tmpPath });
      throw new Error(`Landlord auth not applied in new context; saved storage to ${tmpPath} for inspection`);
    }

    const unique = `E2E Property ${Date.now()}`;
    console.info('DEBUG: Filling property form', unique);
    await authPage.getByLabel('Title', { exact: true }).fill(unique);
    await authPage.getByLabel('Address line 1', { exact: true }).fill('10 Test Street');
    await authPage.getByLabel('City', { exact: true }).fill('Testville');
    await authPage.getByLabel('Postcode', { exact: true }).fill('TE5 1NG');

    // Wait for the rent input to be ready and fill directly by aria-label to avoid potential labelling ambiguity
    const rentInput = authPage.locator('input[aria-label="Rent"]');
    await rentInput.waitFor({ state: 'visible', timeout: 5000 });
    await rentInput.fill('950');
    await authPage.screenshot({ path: `test-results/debug-filled-${Date.now()}.png` });

    // Click create and assert POST response is 201 and contains property
    console.info('DEBUG: Clicking Create Draft Property');
    const [createResp] = await Promise.all([
      authPage.waitForResponse((r) => r.url().includes('/api/landlord/properties') && r.request().method() === 'POST'),
      authPage.getByRole('button', { name: 'Create Draft Property' }).click(),
    ]);

    if (createResp.status() !== 201) {
      const bodyText = await createResp.text();
      await fs.promises.writeFile(`test-results/debug-create-resp-${Date.now()}.txt`, bodyText);
    }

    expect(createResp.status()).toBe(201);
    const createBody = await createResp.json();
    expect(createBody.property?.title).toBe(unique);

    // Should redirect back to landlord properties
    await authPage.waitForURL(/landlord\/properties/);
    await authPage.screenshot({ path: `test-results/debug-after-create-${Date.now()}.png` });

    // Find the created property by its title and assert the nearby rent text (landlord grid uses a different markup)
    const created = authPage.getByText(unique).first();
    await expect(created).toBeVisible();
    // Find the immediate ancestor card element and assert the rent value appears inside it
    const cardAncestor = created.locator('xpath=ancestor::div[1]');
    await expect(cardAncestor.locator(`text=Rent: £${createBody.property?.rentPcm} pcm`)).toBeVisible();

    // Open edit modal by clicking the card
    const propertyCard = authPage.locator('.cursor-pointer').first();
    await propertyCard.click();
    await authPage.screenshot({ path: `test-results/debug-modal-opened-${Date.now()}.png` });

    // Wait for modal and change title
    const modalTitleInput = authPage.getByLabel('Title', { exact: true });
    await expect(modalTitleInput).toBeVisible();
    await modalTitleInput.fill(`${unique} Edited`);

    // Set deposit, amenities, virtual tour and viewing instructions
    await authPage.getByLabel('Deposit').fill('350');
    await authPage.getByLabel('amenity-garden').check();
    await authPage.getByLabel('virtual tour url').fill('https://example.com/tour');
    await authPage.getByLabel('Viewing instructions').fill('Call ahead to arrange access');
    await authPage.screenshot({ path: `test-results/debug-pre-save-${Date.now()}.png` });

    // Save changes and assert PUT response
    const saveButton = authPage.getByRole('button', { name: 'Save changes' });
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.scrollIntoViewIfNeeded();

    console.info('DEBUG: Clicking Save changes');
    // Scroll the modal to the bottom to ensure button is visible
    const modal = authPage.locator('.fixed .w-full.max-w-lg');
    await modal.evaluate(el => el.scrollTop = el.scrollHeight);
    await authPage.waitForTimeout(200); // brief pause for layout stabilisation
    try {
      await saveButton.click({ force: true });
    } catch (clickErr) {
      // Fallback to in-page click via elementHandle.evaluate
      try {
        console.warn('Force click failed, attempting elementHandle.evaluate click', String(clickErr));
        const handle = await saveButton.elementHandle();
        if (handle) {
          await authPage.evaluate((el) => (el as HTMLElement).click(), handle);
        } else {
          throw clickErr;
        }
      } catch (evalErr) {
        console.error('Fallback elementHandle.evaluate click failed', String(evalErr));
        throw new Error('Failed to click Save changes button (force and JS click all failed)');
      }
    }

    let putResp: any = null;
    try {
      putResp = await authPage.waitForResponse(
        (r) => r.request().method() === 'PUT' && r.url().includes('/api/landlord/properties/'),
        { timeout: 15000 }
      );
    } catch (_waitErr) {
      throw new Error('Timed out waiting for PUT response after clicking Save; the page may have reloaded or the request did not complete in time');
    }

    // Save PUT response body for debugging if available (non-fatal)
    try {
      const maybeBody = await putResp.json().catch(() => null);
      await fs.promises.writeFile(`test-results/debug-put-body-${Date.now()}.json`, JSON.stringify(maybeBody, null, 2));
    } catch (_e) {
      // ignore
    }

    // Assert successful PUT
    expect(putResp.status()).toBe(200);

    // Navigate to public property detail using the created property id (avoid depending on PUT response body)
    const propId = createBody.property?._id;
    await authPage.goto(`http://localhost:3000/public/properties/${propId}`);
    await authPage.waitForLoadState('load');
    await expect(authPage.locator('[data-testid="prop-detail-deposit"]')).toBeVisible();
    await expect(authPage.locator('[data-testid="prop-detail-viewing"]')).toBeVisible();

    // Navigate back to landlord properties page to delete the property
    await authPage.goto('http://localhost:3000/landlord/properties');
    await authPage.waitForLoadState('load');

    // Open modal again and delete property
    const deleteCard = authPage.locator('.cursor-pointer').first();
    await expect(deleteCard).toBeVisible();
    await deleteCard.click();
    await authPage.screenshot({ path: `test-results/debug-delete-modal-opened-${Date.now()}.png` });

    // Wait for modal to open
    const delButton = authPage.getByRole('button', { name: 'Delete' });
    await expect(delButton).toBeVisible({ timeout: 5000 });
    await authPage.screenshot({ path: `test-results/debug-delete-button-visible-${Date.now()}.png` });
    // Scroll the modal to the bottom
    const delModal = authPage.locator('.fixed .w-full.max-w-lg');
    await delModal.evaluate(el => el.scrollTop = el.scrollHeight);
    await authPage.waitForTimeout(200);
    try {
      await delButton.click({ force: true });
    } catch (_clickErr) {
      const handle = await delButton.elementHandle();
      if (handle) await authPage.evaluate((el) => (el as HTMLElement).click(), handle);
      else throw new Error('Failed to click Delete button (force and JS click all failed)');
    }

    let delResp: any = null;
    try {
      delResp = await authPage.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('/api/landlord/properties/'), { timeout: 15000 });
    } catch (_err) {
      throw new Error('Timed out waiting for DELETE response after clicking Delete');
    }

    if (![200, 204].includes(delResp.status())) {
      const bodyText = await delResp.text();
      await fs.promises.writeFile(`test-results/debug-delete-resp-${Date.now()}.txt`, bodyText);
    }

    expect([200, 204]).toContain(delResp.status());

    // After deletion, verify the property is no longer present
    await authPage.waitForTimeout(1000);
    await expect(authPage.getByText(`${unique} Edited`).first()).toHaveCount(0);
  } catch (e) {
    // Save debugging artifacts and rethrow (guard if page/context is closed)
    const ts = Date.now();
    try {
      if (!authPage.isClosed()) await authPage.screenshot({ path: `test-results/debug-failure-${ts}.png`, fullPage: true });
    } catch (s) {
      console.error('Failed to take failure screenshot', s);
    }
    try {
      if (authContext) await authContext.storageState({ path: `test-results/debug-storage-${ts}.json` });
    } catch (s) {
      console.error('Failed to save storage state', s);
    }
    // Save console logs (if any) - Playwright captures them in the trace, but we'll log message
    console.error('Test failed, saved artifacts with prefix test-results/debug-failure-');
    throw e;
  } finally {
    // Clean up the created context (ignore errors if already closed)
    try {
      if (authContext) await authContext.close();
    } catch (_e) {
      // ignore
    }
  }
});