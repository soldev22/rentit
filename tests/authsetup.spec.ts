import { test as setup, expect } from '@playwright/test';

const roles = [
  'applicant',
  'tenant',
  'landlord',
  'admin',
  'agent',
] as const;

for (const role of roles) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    await page.getByLabel('Email').fill(`${role}@test.local`);
    await page.getByLabel('Password').fill('pasta123');

    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page).toHaveURL(/dashboard/);

    await page.context().storageState({
      path: `playwright/.auth/${role}.json`,
    });
  });
}
