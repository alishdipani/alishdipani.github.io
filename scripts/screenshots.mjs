// Screenshots of the main pages at desktop and phone width, plus a browser check:
// fails if any page logs a console error, or if the 404 fallback doesn't redirect.
// Needs a build in dist/ and Google Chrome installed (uses playwright-core, no bundled browser).
// Usage: node scripts/screenshots.mjs [outDir]   (default docs/screenshots)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { createServer, listen } from './serve.mjs';

const outDir = process.argv[2] ?? 'docs/screenshots';
const PAGES = {
  home: '/',
  publications: '/publications/',
  blog: '/blog/',
  cv: '/cv/',
  post: '/blog/neural-style-transfer-audio/',
  404: '/no-such-page/',
};
const WIDTHS = { desktop: 1280, phone: 390 };
// Paths that only the 404 page's script can rescue, and where they should land.
const FALLBACKS = {
  '/gsoc2019/2019/06/09/GSoC-2019-project-introduction/': '/blog/gsoc-2019-project-introduction/',
  '/blog/tag/anything/': '/blog/',
  '/news/some-old-item/': '/',
  '/awards': '/cv/',
};

const server = createServer('dist');
const base = `http://127.0.0.1:${await listen(server)}`;
const browser = await chromium.launch({ channel: 'chrome' });
const problems = [];
fs.mkdirSync(outDir, { recursive: true });

for (const [device, width] of Object.entries(WIDTHS)) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  for (const [name, url] of Object.entries(PAGES)) {
    const page = await context.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error' && !(name === '404' && /404/.test(m.text()))) problems.push(`${name} (${device}): ${m.text()}`);
    });
    page.on('pageerror', (e) => problems.push(`${name} (${device}): ${e.message}`));
    await page.goto(base + url, { waitUntil: 'networkidle' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) problems.push(`${name} (${device}): page scrolls horizontally by ${overflow}px`);
    const file = path.join(outDir, `${name}-${device}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log('saved', file);
    await page.close();
  }
  await context.close();
}

const page = await browser.newPage();
for (const [from, to] of Object.entries(FALLBACKS)) {
  await page.goto(base + from, { waitUntil: 'networkidle' });
  const landed = new URL(page.url()).pathname;
  if (landed !== to) problems.push(`fallback ${from}: landed on ${landed}, expected ${to}`);
}
await browser.close();
server.close();

if (problems.length) {
  console.log('\nFAIL');
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}
console.log('\nPASS: no console errors, no horizontal scroll, 404 fallbacks redirect');
