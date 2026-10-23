// Renders the PNG fallbacks from public/favicon.svg (for Safari, which ignores SVG icons):
//   public/favicon-32.png         32×32, rounded square as in the SVG, transparent corners
//   public/apple-touch-icon.png   180×180, the #0E1624 square filling the whole canvas (no transparency, no rounded corners)
// Run: node tools/favicon/make.mjs
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const svg = fs.readFileSync('public/favicon.svg', 'utf8');
const browser = await chromium.launch({ channel: 'chrome' });
async function render(markup, size, file, transparent) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, colorScheme: 'light' });
  const uri = 'data:image/svg+xml;base64,' + Buffer.from(markup).toString('base64');
  await page.setContent(`<body style="margin:0;background:transparent"><img src="${uri}" width="${size}" height="${size}" style="display:block">`);
  await page.waitForFunction(() => document.images[0].complete);
  await page.screenshot({ path: file, omitBackground: transparent });
  await page.close();
}
await render(svg, 32, 'public/favicon-32.png', true);
await render(svg.replace(' rx="7"', ''), 180, 'public/apple-touch-icon.png', false);
await browser.close();
for (const f of ['public/favicon-32.png', 'public/apple-touch-icon.png']) console.log(f, fs.statSync(f).size, 'bytes');
