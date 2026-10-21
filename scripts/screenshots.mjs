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
  demo: '/blog/template-demo/',
  404: '/no-such-page/',
};
const WIDTHS = { desktop: 1280, phone: 390 };
// Pages also captured in dark mode.
const DARK = ['home', 'demo', 'post'];
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

const runs = Object.entries(WIDTHS).flatMap(([device, width]) => [
  { device, width, scheme: 'light', pages: Object.entries(PAGES) },
  { device, width, scheme: 'dark', pages: Object.entries(PAGES).filter(([n]) => DARK.includes(n)) },
]);
for (const { device, width, scheme, pages } of runs) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, colorScheme: scheme });
  for (const [name, url] of pages) {
    const page = await context.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error' && !(name === '404' && /404/.test(m.text()))) problems.push(`${name} (${device}): ${m.text()}`);
    });
    page.on('pageerror', (e) => problems.push(`${name} (${device}): ${e.message}`));
    await page.goto(base + url, { waitUntil: 'networkidle' });
    // Scroll through the page so lazy-loaded images load before the full-page capture.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle');
    const broken = await page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src));
    for (const src of broken) problems.push(`${name} (${device}): image did not load: ${src}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) problems.push(`${name} (${device}): page scrolls horizontally by ${overflow}px`);
    const file = path.join(outDir, `${name}-${device}${scheme === 'dark' ? '-dark' : ''}.jpg`);
    await page.screenshot({ path: file, fullPage: true, type: 'jpeg', quality: 80 });
    console.log('saved', file);
    await page.close();
  }
  await context.close();
}

// Hover cards: hovering a citation and a footnote shows their text.
const hoverPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await hoverPage.goto(base + PAGES.demo, { waitUntil: 'networkidle' });
for (const sel of ['a.citation', 'a[data-footnote-ref]']) {
  await hoverPage.hover(sel);
  const card = await hoverPage.locator('.hover-card').textContent({ timeout: 2000 }).catch(() => '');
  if (!(await hoverPage.locator('.hover-card').isVisible()) || !card?.trim()) problems.push(`hover card did not show for ${sel}`);
  await hoverPage.mouse.move(0, 0);
}
await hoverPage.close();

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
console.log('\nPASS: no console errors, no horizontal scroll, hover cards work, 404 fallbacks redirect');
