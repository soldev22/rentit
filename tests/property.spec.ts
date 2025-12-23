import { test, expect } from '@playwright/test';

test('properties page renders and first property opens if present', async ({ page }) => {
  await page.goto('http://localhost:3000/public/properties');

  await expect(page.getByRole('heading', { name: 'Available Properties' })).toBeVisible();

  const none = await page.getByText('No properties currently listed.').count();
  if (none > 0) {
    await expect(page.getByText('No properties currently listed.')).toBeVisible();
    return;
  }

  // Click the first property card link and verify property page loads
  const first = page.locator('a[href^="/public/properties/"]').first();
  await first.click();
  await expect(page).toHaveURL(/\/public\/properties\/[a-zA-Z0-9]/);
  await expect(page.locator('h1')).toBeVisible();
});