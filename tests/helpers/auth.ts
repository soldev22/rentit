import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import type { Page } from '@playwright/test';

export async function ensureLandlordAuth(page: Page) {
  const storagePath = path.resolve('playwright/.auth/landlord.json');

  // If storage state already exists, skip sign in
  if (fs.existsSync(storagePath)) {
    // Read credentials from scripts/test-qa.json so callers can sign-in in a fresh context if needed
    const info = fs.existsSync(infoPath) ? JSON.parse(fs.readFileSync(infoPath, 'utf8')) : null;
    return { storagePath, email: info?.email, password: info?.password };
  }

  // Ensure test landlord exists
  const infoPath = path.resolve('scripts/test-qa.json');
  if (!fs.existsSync(infoPath)) {
    try {
      execSync('node scripts/create-test-landlord.js', { stdio: 'inherit' });
    } catch (e) {
      throw new Error('Could not create test landlord. Ensure MONGODB_URI is set and script can run.');
    }
  }

  const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
  const email = info.email;
  const password = info.password;

  // Sign in via UI and save storage state
  await page.goto('http://localhost:3000/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  // wait for dashboard or other role page
  await page.waitForURL(/(dashboard|applicant|tenant|landlord|admin)/, { timeout: 15000 });

  // Write storage state
  await page.context().storageState({ path: storagePath });

  return { storagePath, email };
}