const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const url = process.env.APP_BASE_URL || 'https://rentit-nine.vercel.app/public/properties/6949a91e49a6dae5159d83f1';
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  console.log('navigating to', url);
  page.setDefaultNavigationTimeout(120000);
  await page.goto(url, { waitUntil: 'load' });

  // Accessibility snapshot
  let acc = null;
  try {
    acc = await page.accessibility.snapshot();
  } catch (e) {
    acc = { error: String(e) };
  }

  // Performance entries (trimmed)
  const perfTiming = await page.evaluate(() => {
    const entries = performance.getEntries().map(e => ({
      name: e.name,
      entryType: e.entryType,
      startTime: e.startTime,
      duration: e.duration,
      transferSize: e.transferSize,
      encodedBodySize: e.encodedBodySize,
      decodedBodySize: e.decodedBodySize
    }));
    return {
      timing: (performance.timing && typeof performance.timing.toJSON === 'function') ? performance.timing.toJSON() : {},
      entries: entries.slice(0, 200)
    };
  });

  // Try to capture LCP entries
  let lcp = null;
  try {
    lcp = await page.evaluate(() => {
      return new Promise(resolve => {
        try {
          const observer = new PerformanceObserver(list => {
            const items = list.getEntries();
            resolve(items.map(i => ({ renderTime: i.renderTime, loadTime: i.loadTime, size: i.size, url: i.url }))); 
          });
          observer.observe({ type: 'largest-contentful-paint', buffered: true });
          setTimeout(() => resolve(null), 500);
        } catch (e) {
          resolve(null);
        }
      });
    });
  } catch (e) {
    lcp = { error: String(e) };
  }

  const result = { url, acc, perfTiming, lcp };
  fs.writeFileSync('scripts/e2e-artifacts/local-audit.json', JSON.stringify(result, null, 2));
  console.log('Saved local audit to scripts/e2e-artifacts/local-audit.json');

  await browser.close();
})();
