const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { MongoClient } = require('mongodb');
const dotenvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(dotenvPath)) {
  const raw = fs.readFileSync(dotenvPath, 'utf8');
  raw.split(/\r?\n/).forEach((l) => {
    const m = l.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const k = m[1].trim();
      let v = m[2];
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      process.env[k] = v;
    }
  });
}

(async () => {
  const qaPath = path.resolve(__dirname, 'test-qa.json');
  if (!fs.existsSync(qaPath)) {
    console.error('Missing scripts/test-qa.json; run create-test-landlord.js first');
    process.exit(1);
  }

  const qa = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
  const bases = [process.env.APP_BASE_URL, 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://192.168.1.70:3000'].filter(Boolean);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  let base;
  for (const b of bases) {
    try {
      console.log('Trying', b);
      await page.goto(`${b}/login`, { waitUntil: 'networkidle', timeout: 5000 });
      base = b;
      console.log('Connected to', b);
      break;
    } catch (e) {
      console.warn('Cannot connect to', b);
    }
  }

  if (!base) {
    console.error('Could not reach the dev server on any configured host');
    await browser.close();
    process.exit(1);
  }

  console.log('Navigating to login...');

  await page.fill('input[type="email"]', qa.email);
  await page.fill('input[type="password"]', qa.password);
  await page.click('button[type="submit"]');

  // wait for redirect to dashboard or landlord page
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('Signed in successfully');

  // Go to Add Property
  await page.goto(`${base}/landlord/properties/new`, { waitUntil: 'networkidle' });

  const title = `QA E2E Test ${Date.now()}`;
  const headline = 'QA E2E headline';

  await page.fill('label:has-text("Listing headline") >> input', headline);
  await page.fill('label:has-text("Title") >> input', title);
  await page.fill('label:has-text("Description") >> textarea', 'E2E created property');
  await page.fill('label:has-text("Address line 1") >> input', '123 Test St');
  await page.fill('label:has-text("City") >> input', 'TestCity');
  await page.fill('label:has-text("Postcode") >> input', 'T3 0ST');
  await page.fill('label:has-text("Rent") >> input[type="number"]', '750');

  // upload photo
  const filePath = path.resolve(__dirname, 'sample.png');
  await page.setInputFiles('input[type="file"]', filePath);

  // wait for preview
  await page.waitForSelector('img[alt^="photo-"]', { timeout: 10000 });
  console.log('Photo uploaded and previewed');

  // screenshot after upload
  const artifactsDir = path.resolve(__dirname, 'e2e-artifacts');
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir);
  await page.screenshot({ path: path.join(artifactsDir, `upload-${Date.now()}.png`), fullPage: true });

  // submit
  await page.click('button:has-text("Create Draft Property")');

  // wait for redirect back to properties list
  await page.waitForURL('**/landlord/properties', { timeout: 20000 });
  console.log('Form submitted and redirected');

  // screenshot after submit
  await page.screenshot({ path: path.join(artifactsDir, `submitted-${Date.now()}.png`), fullPage: true });

  // verify in MongoDB
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing for verification');
    await browser.close();
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const prop = await db.collection('properties').findOne({ title });

  if (!prop) {
    console.error('Property not found in DB');
    await client.close();
    await browser.close();
    process.exit(1);
  }

  console.log('Property found in DB with id', prop._id.toString());
  console.log('Photos stored on property:', (prop.photos || []).length);

  // Check Azure blob (if photos present)
  if ((prop.photos || []).length > 0) {
    const photo = prop.photos[0];
    console.log('First photo URL:', photo.url);
  } else {
    console.warn('No photo saved on the property');
  }

  await client.close();
  await browser.close();
  console.log('E2E test completed successfully');
})();