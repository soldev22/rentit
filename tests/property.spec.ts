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
  const firstLink = page.locator('a[href^="/public/properties/"]').first();

  // Validate the first property card includes expected test ids
  const firstCard = page.locator('[data-testid^="property-card-"]').first();
  await expect(firstCard.locator('[data-testid="property-title"]')).toBeVisible();
  await expect(firstCard.locator('[data-testid="property-price"]')).toBeVisible();
  if (await firstCard.locator('[data-testid="prop-bedrooms"]').count() > 0) {
    await expect(firstCard.locator('[data-testid="prop-bedrooms"]')).toBeVisible();
  }

  await firstLink.click();
  await expect(page).toHaveURL(/\/public\/properties\/[a-zA-Z0-9]/);
  await expect(page.locator('h1')).toBeVisible();

  // On the property detail page, assert the sidebar test ids are present when available
  await expect(page.locator('[data-testid="prop-price"]')).toBeVisible();
  await expect(page.locator('[data-testid="prop-status-badge"]')).toBeVisible();
  if (await page.locator('[data-testid="prop-detail-bedrooms"]').count() > 0) {
    await expect(page.locator('[data-testid="prop-detail-bedrooms"]')).toBeVisible();
  }
});