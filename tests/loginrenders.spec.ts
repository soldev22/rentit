import { test, expect } from '@playwright/test';
test('user can submit login form', async ({ page }) => {
  await page.goto('http://localhost:3000/login');

  await page.getByLabel('Email').fill('na@na.com');
  await page.getByLabel('Password').fill('pasta123');

  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page).toHaveURL(/dashboard/);
});

