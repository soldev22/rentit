import { test, expect } from '@playwright/test';

test('user can register and is redirected to login', async ({ page }) => {
  const email = `e2e+${Date.now()}@test.local`;

  await page.goto('http://localhost:3000/register');

  await page.getByLabel('Name').fill('E2E User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Telephone').fill('01234567890');
  await page.getByLabel('Password').fill('pasta123');

  await page.getByRole('button', { name: 'Register', exact: true }).click();

  // Some browsers might be slower (WebKit); wait longer for either the success message or the redirect
  try {
    await page.waitForSelector('text=Registration successful! Please sign in.', { timeout: 20000 });
  } catch (_err) {
    await page.waitForURL(/\/login.*registered=1/, { timeout: 20000 });
  }
  await expect(page.getByText('Registration successful! Please sign in.')).toBeVisible();
});

test('duplicate registration shows an error message', async ({ page }) => {
  const email = `e2e+${Date.now()}@test.local`;

  // Register once
  await page.goto('http://localhost:3000/register');
  await page.getByLabel('Name').fill('E2E User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('pasta123');
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await page.waitForURL(/\/login.*registered=1/);

  // Attempt to register again with the same email
  await page.goto('http://localhost:3000/register');
  await page.getByLabel('Name').fill('E2E User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('pasta123');
  await page.getByRole('button', { name: 'Register', exact: true }).click();

  // The page sets an error into a red text div; assert some red error text appears
  const redError = page.locator('.text-red-600');
  await expect(redError).toBeVisible();
  await expect(redError).not.toHaveText('');
});

test('invalid login shows error', async ({ page }) => {
  await page.goto('http://localhost:3000/login');

  await page.getByLabel('Email').fill('no-such-user@test.local');
  await page.getByLabel('Password').fill('wrongpassword');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  // NextAuth will redirect with an error query on failed credentials
  await page.waitForURL(/\/login.*error=/);
  await expect(page).toHaveURL(/\/login/);
});

test('user can sign in and sign out', async ({ page }) => {
  await page.goto('http://localhost:3000/login');

  await page.getByLabel('Email').fill('applicant@test.local');
  await page.getByLabel('Password').fill('pasta123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  // After sign-in the app may redirect to a role specific page (dashboard, applicant, tenant, landlord, admin)
  await expect(page).toHaveURL(/(dashboard|applicant|tenant|landlord|admin)/);

  // Wait for an authenticated header item before attempting sign out (try several indicators)
  const signOutLocator = page.locator('text=Sign out');
  let found = false;
  try {
    await expect(signOutLocator).toBeVisible({ timeout: 5000 });
    found = true;
  } catch (_e) {}

  if (!found) {
    try {
      await expect(page.getByRole('link', { name: 'My profile' })).toBeVisible({ timeout: 5000 });
      found = true;
    } catch (_e) {}
  }

  if (!found) {
    try {
      await expect(page.getByRole('link', { name: 'Landlord Dashboard' })).toBeVisible({ timeout: 5000 });
      found = true;
    } catch (_e) {}
  }

  if (!found) {
    // As a last resort, open the mobile menu and retry
    const toggle = page.getByRole('button', { name: 'Toggle menu' });
    if (await toggle.count()) await toggle.click();
    try {
      await expect(signOutLocator).toBeVisible({ timeout: 5000 });
      await signOutLocator.first().click();
      await expect(page).toHaveURL(/\/login/);
      return;
    } catch (_e) {
      // Programmatic fallback: find a button or link with exact text "Sign out" and click it via page.evaluate
      await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('button, a')).find((n) => n.textContent?.trim() === 'Sign out');
        if (el) (el as HTMLElement).click();
      });
      await expect(page).toHaveURL(/\/login/);
      return;
    }
  }

  await signOutLocator.first().click();
  await expect(page).toHaveURL(/\/login/);
});